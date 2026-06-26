"use client";

// Ref-counted, shared scroll lock. Multiple overlapping modals (the error
// dialog, the mobile tutorial, and AppDialogSheet) can be open at once; if each
// snapshotted and restored the global overflow styles independently, the last to
// restore would reinstate the other's "hidden" snapshot and leave the page stuck
// (or, conversely, prematurely unlock while another modal is still open).
// Snapshot once on the first acquire, restore once on the last release.
interface ScrollLockSnapshot {
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyWidth: string;
  scrollY: number;
}

let scrollLockCount = 0;
let scrollLockSnapshot: ScrollLockSnapshot | null = null;

export function acquireScrollLock({
  freezeScroll = false,
}: { freezeScroll?: boolean } = {}): () => void {
  scrollLockCount += 1;

  if (scrollLockSnapshot === null) {
    scrollLockSnapshot = {
      htmlOverflow: document.documentElement.style.overflow,
      htmlOverscrollBehavior: document.documentElement.style.overscrollBehavior,
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyWidth: document.body.style.width,
      scrollY: window.scrollY,
    };
  }

  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  if (freezeScroll) {
    const { scrollY } = scrollLockSnapshot;
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    scrollLockCount -= 1;
    if (scrollLockCount > 0 || scrollLockSnapshot === null) return;

    const snapshot = scrollLockSnapshot;
    scrollLockSnapshot = null;
    document.documentElement.style.overflow = snapshot.htmlOverflow;
    document.documentElement.style.overscrollBehavior =
      snapshot.htmlOverscrollBehavior;
    document.body.style.overflow = snapshot.bodyOverflow;
    document.body.style.position = snapshot.bodyPosition;
    document.body.style.top = snapshot.bodyTop;
    document.body.style.width = snapshot.bodyWidth;
    window.scrollTo(0, snapshot.scrollY);
  };
}
