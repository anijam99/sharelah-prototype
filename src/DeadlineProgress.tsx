import { useState } from "react";

/** Two rotating semicircles drain smoothly, independently of React timer ticks. */
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
      className="receipt-countdown-clock"
      role="timer"
      aria-label={`Confirmation in ${seconds} seconds`}
    >
      <div className="timer-track" aria-hidden="true" />
      {(["right", "left"] as const).map((side) => (
        <div key={side} className={`timer-half ${side}`} aria-hidden="true">
          <span
            className="timer-arc"
            style={{ animationDelay: `-${elapsed}ms` }}
          />
        </div>
      ))}
      <strong>{seconds}</strong>
      <span>seconds</span>
    </div>
  );
}
