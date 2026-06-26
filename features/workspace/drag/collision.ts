import {
  closestCorners,
  pointerWithin,
  type CollisionDetection,
} from "@dnd-kit/core";

import { getDragData } from "./types";

export const taskDragCollisionDetection: CollisionDetection = (args) => {
  const activeType = getDragData(args.active)?.type;

  const filteredDroppableContainers = args.droppableContainers.filter(
    (container) => {
      const containerType = getDragData(container)?.type;

      if (activeType === "task-list") {
        return containerType === "task-list";
      }

      if (activeType === "task") {
        return (
          containerType === "task" ||
          containerType === "task-dropzone"
        );
      }

      return true;
    },
  );

  const nextArgs =
    filteredDroppableContainers.length > 0
      ? { ...args, droppableContainers: filteredDroppableContainers }
      : args;

  const typeById = new Map<string | number, string | undefined>();
  for (const container of nextArgs.droppableContainers) {
    typeById.set(container.id, getDragData(container)?.type);
  }

  const prioritizeTaskCollisions = <T extends { id: string | number }>(
    collisions: T[],
  ) =>
    [...collisions].sort((left, right) => {
      const leftType = typeById.get(left.id);
      const rightType = typeById.get(right.id);

      if (leftType === rightType) {
        return 0;
      }

      if (leftType === "task") {
        return -1;
      }

      if (rightType === "task") {
        return 1;
      }

      return 0;
    });

  const pointerCollisions = pointerWithin(nextArgs);
  if (pointerCollisions.length > 0) {
    return activeType === "task"
      ? prioritizeTaskCollisions(pointerCollisions)
      : pointerCollisions;
  }

  const cornerCollisions = closestCorners(nextArgs);
  return activeType === "task"
    ? prioritizeTaskCollisions(cornerCollisions)
    : cornerCollisions;
};
