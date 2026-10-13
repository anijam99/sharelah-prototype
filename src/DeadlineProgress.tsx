import { useState } from "react";

/** CSS drives each frame; the reservation's wall-clock deadline stays authoritative. */
export function DeadlineProgress({
  deadline,
  seconds,
}: {
  deadline: number;
  seconds: number;
}) {
  const [elapsed] = useState(() =>
    Math.max(0, Math.min(5000, 5000 - (deadline - Date.now()))),
  );
  return (
    <div
      className="confirmation-progress"
      role="timer"
      aria-label={`Confirmation in ${seconds} seconds`}
    >
      <span
        className="deadline-fill"
        style={{ animationDelay: `-${elapsed}ms` }}
      />
      <small className="reduced-deadline">{seconds} seconds to undo</small>
    </div>
  );
}
