// Total duration of the `task-completing` strike + fade animation defined
// in app/globals.css (250ms strike-draw + 280ms task-complete-fade with a
// 250ms delay → ends at 530ms). Callers should dispatch the actual
// `mark_task_done` after this delay so the row finishes animating before
// it unmounts.
export const TASK_STRIKE_ANIMATION_MS = 530;
