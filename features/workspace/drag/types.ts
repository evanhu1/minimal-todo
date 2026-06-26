export type DragData =
  | { type: "task"; taskListId: string }
  | { type: "task-list" }
  | { type: "task-dropzone"; taskListId: string };

export type DragDataType = DragData["type"];

export function getDragData(
  source: { data: { current: unknown } } | null | undefined,
): DragData | null {
  const data = source?.data.current;
  if (!data || typeof data !== "object" || !("type" in data)) return null;
  return data as DragData;
}
