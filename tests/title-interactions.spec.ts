import { expect, test, type Locator, type Page } from "@playwright/test";

const rows = (page: Page) => page.locator("[data-task-id]");
const titles = (page: Page) => rows(page).locator("textarea");
const shield = (row: Locator) => row.locator("[data-task-focus-surface] > div[aria-hidden=true]");

async function order(page: Page) {
  return titles(page).evaluateAll(fields => fields.map(field => (field as HTMLTextAreaElement).value));
}

async function openBoard(page: Page, path: string) {
  await page.goto(path);
  await page.getByRole("button", { name: "Add task", exact: true }).first().click();
  await page.getByPlaceholder("Add task").fill("Alpha");
  for (const title of ["Bravo", "Charlie"]) {
    const last = titles(page).last();
    await last.press("End");
    await last.press("Enter");
    await expect(titles(page).last()).toBeFocused();
    await titles(page).last().fill(title);
  }
  await expect.poll(() => order(page)).toEqual(["Alpha", "Bravo", "Charlie"]);
  await titles(page).last().blur();
}

async function expectSaved(page: Page, expected: string[]) {
  // Wait for the debounced write before reloading. Read the actual IDB record.
  await expect.poll(() => page.evaluate(() => new Promise<string[]>((resolve, reject) => {
    const request = indexedDB.open("keyval-store");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const read = db.transaction("keyval").objectStore("keyval").get("minimal-todo:workspace");
      read.onerror = () => { db.close(); reject(read.error); };
      read.onsuccess = () => {
        const board = read.result;
        const list = board?.taskLists[board.taskListOrder[0]];
        db.close();
        resolve(list?.taskOrder.map((id: string) => list.tasks[id].title) ?? []);
      };
    };
  }))).toEqual(expected);
  await page.reload();
  await expect.poll(() => order(page)).toEqual(expected);
}

// Keep synthetic touches on the original element so dnd-kit sees a single hold
// and move on touch WebKit. The native iOS selection menu needs a device check.
async function touch(target: Locator, type: string, x: number, y: number) {
  await target.evaluate((el, args) => {
    const point = { identifier: 1, target: el, clientX: args.x, clientY: args.y,
      pageX: args.x + scrollX, pageY: args.y + scrollY, screenX: args.x, screenY: args.y };
    const active = args.type === "touchend" ? [] : [point];
    const event = document.createEvent("TouchEvent");
    event.initEvent(args.type, true, true);
    Object.defineProperties(event, {
      touches: { value: active }, targetTouches: { value: active }, changedTouches: { value: [point] },
    });
    el.dispatchEvent(event);
  }, { type, x, y });
}

for (const mode of ["default", "enhanced"]) {
  test.describe(mode, () => {
    test.beforeEach(async ({ page }) => {
      await openBoard(page, mode === "default" ? "/" : "/enhanced.html");
    });

    test("edited titles survive a reload", async ({ page }) => {
      await titles(page).first().fill("Edited");
      await expectSaved(page, ["Edited", "Bravo", "Charlie"]);
    });

    test("desktop Shift+Enter follows the selected mode", async ({ page, isMobile }) => {
      test.skip(isMobile);
      const title = titles(page).first();
      await title.press("End");
      await title.press("Shift+Enter");
      if (mode === "enhanced") {
        await expect(page.getByRole("dialog", { name: "Alpha" })).toBeVisible();
        await expect(titles(page)).toHaveCount(3);
      } else {
        await expect(titles(page)).toHaveCount(4);
        await expect(page.getByRole("dialog")).toHaveCount(0);
      }
    });

    test("holding an unfocused title reorders and persists", async ({ page, isMobile }) => {
      test.skip(!isMobile);
      const id = await rows(page).first().getAttribute("data-task-id");
      const row = page.locator(`[data-task-id="${id}"]`);
      const target = shield(row);
      const start = (await target.boundingBox())!;
      const end = (await rows(page).last().boundingBox())!;
      const x = start.x + 10;
      await touch(target, "touchstart", x, start.y + 10);
      await expect(row).toHaveClass(/opacity-0/);
      await touch(target, "touchmove", x, end.y + end.height / 2);
      await expect.poll(() => order(page)).not.toEqual(["Alpha", "Bravo", "Charlie"]);
      await touch(target, "touchend", x, end.y + end.height / 2);
      await expect(row).not.toHaveClass(/opacity-0/);
      await expectSaved(page, await order(page));
    });
  });
}

test.describe("enhanced input", () => {
  test.beforeEach(async ({ page }) => { await openBoard(page, "/enhanced.html"); });

  test("composition owns Enter and arrows and the field keeps its context menu", async ({ page }) => {
    const title = titles(page).first();
    await title.focus();
    for (const key of ["Enter", "ArrowDown"]) {
      const allowed = await title.evaluate((el, key) => el.dispatchEvent(
        new KeyboardEvent("keydown", { key, isComposing: true, bubbles: true, cancelable: true }),
      ), key);
      expect(allowed).toBe(true);
    }
    await expect(title).toBeFocused();
    await expect(titles(page)).toHaveCount(3);
    expect(await title.evaluate(el => el.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
    ))).toBe(true);
  });

  test("scroll, selection and notes never start a row drag", async ({ page, isMobile }) => {
    test.skip(!isMobile);
    const row = rows(page).first();
    const target = shield(row);
    const box = (await target.boundingBox())!;
    const x = box.x + 12, y = box.y + 8;
    await touch(target, "touchstart", x, y);
    await touch(target, "touchmove", x, y + 35);
    await page.waitForTimeout(500); // Exceed dnd-kit's 400ms hold delay.
    await expect(row).not.toHaveClass(/opacity-0/);
    await touch(target, "touchend", x, y + 35);

    await target.tap();
    const title = row.locator("textarea");
    await expect(title).toBeFocused();
    await title.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(1, 4));
    await touch(title, "touchstart", x, y);
    await page.waitForTimeout(500);
    await expect(row).not.toHaveClass(/opacity-0/);
    await touch(title, "touchmove", x, y + 60);
    await touch(title, "touchend", x, y + 60);
    expect(await title.evaluate((el: HTMLTextAreaElement) => [el.selectionStart, el.selectionEnd])).toEqual([1, 4]);
    expect(await title.evaluate(el => getComputedStyle(el).getPropertyValue("-webkit-touch-callout"))).not.toBe("none");

    await row.getByRole("button", { name: "Open notes for Alpha" }).tap();
    const heading = page.getByRole("dialog").getByRole("heading", { name: "Alpha" });
    const note = (await heading.boundingBox())!;
    await touch(heading, "touchstart", note.x + 5, note.y + 5);
    await page.waitForTimeout(500);
    await expect(row).not.toHaveClass(/opacity-0/);
    await touch(heading, "touchend", note.x + 5, note.y + 5);
    expect(await order(page)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  test("soft-keyboard Return inserts and focuses exactly one blank row above", async ({ page, isMobile }) => {
    test.skip(!isMobile);
    const title = titles(page).first();
    await title.focus();
    await title.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 0));
    await title.press("Shift+Enter");
    await expect.poll(() => order(page)).toEqual(["", "Alpha", "Bravo", "Charlie"]);
    await expect(titles(page).first()).toBeFocused();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("a non-cancelable soft line break is consumed once", async ({ page, isMobile }) => {
    test.skip(!isMobile);
    const title = titles(page).first();
    await title.focus();
    await title.evaluate((el: HTMLTextAreaElement) => {
      el.setSelectionRange(0, 0);
      const options = { inputType: "insertLineBreak", bubbles: true, cancelable: false };
      el.dispatchEvent(new InputEvent("beforeinput", options));
      el.setRangeText("\n", 0, 0, "end");
      el.dispatchEvent(new InputEvent("input", options));
    });
    await expect.poll(() => order(page)).toEqual(["", "Alpha", "Bravo", "Charlie"]);
    await expect(titles(page).first()).toBeFocused();
  });
});
