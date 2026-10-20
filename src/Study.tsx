import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";
import { useStore } from "./store";
import { go } from "./router";
import {
  acceptJoiner,
  collectJoiner,
  hostedComplete,
  type Product,
} from "./model";
import {
  loadStudy,
  saveStudy,
  studyCsv,
  uploadStudy,
  SHEETS_URL,
  type Study as StudyState,
  type StudyRoute,
} from "./studyData";
import type { CreateVariant } from "./Create";

const names: Record<CreateVariant, string> = {
  A: "step by step",
  B: "one page",
};
const SCAN_DELAY_MS = 3000,
  RATING_DELAY_MS = 1800;
const likert = [
  "Very difficult",
  "Difficult",
  "Neither easy nor difficult",
  "Easy",
  "Very easy",
];

/** Splits made by the participant have UUID ids; seeded ones do not. */
export const hostedByParticipant = (p: Product) =>
  p.owner && /^[0-9a-f-]{36}$/.test(p.id);

/** Run the study for the current round; returns the UI layout to show. */
export function useStudy(route: StudyRoute | null) {
  const [study, setStudy] = useState<StudyState | null>(() =>
    route ? loadStudy(route) : null,
  );
  useEffect(() => {
    if (study) saveStudy(study);
  }, [study]);
  const update = (fn: (s: StudyState) => StudyState) =>
    setStudy((s) => (s ? fn(s) : s));
  return [study, update] as const;
}

export function Study({
  study,
  setStudy,
}: {
  study: StudyState;
  setStudy: (fn: (s: StudyState) => StudyState) => void;
}) {
  const { state, update, reset } = useStore(),
    round = study.rounds[study.current],
    [busy, setBusy] = useState(false),
    [upload, setUpload] = useState<"idle" | "sending" | "sent" | "failed">(
      study.uploaded ? "sent" : "idle",
    ),
    [rating, setRating] = useState<number>(0),
    [comment, setComment] = useState(""),
    purchasedAt = useRef(0);
  const mine = state.products.find(hostedByParticipant);

  // Jerry joins by himself, then scans the pickup code once the host has bought.
  useEffect(() => {
    if (study.phase !== "task" || study.taskEnd) return;
    const timer = window.setInterval(() => {
      if (!mine || mine.closed) return;
      const jerry = (state.joinRequests[mine.id] || []).find(
        (r) => r.person === "jerry",
      );
      if (jerry?.status === "requested" && !(Date.parse(jerry.at) > Date.now()))
        update((s) => acceptJoiner(s, mine.id, "jerry"));
      if (jerry?.status === "accepted" && mine.purchased) {
        purchasedAt.current ||= Date.now();
        if (Date.now() - purchasedAt.current >= SCAN_DELAY_MS)
          update((s) => collectJoiner(s, mine.id, "jerry"));
      }
    }, 400);
    return () => window.clearInterval(timer);
  }, [study.phase, study.taskEnd, mine, state.joinRequests, update]);

  // The clock stops the moment the split completes.
  const complete = !!mine && hostedComplete(state, mine);
  useEffect(() => {
    if (study.phase !== "task" || study.taskEnd || !complete) return;
    const end = Date.now();
    setStudy((s) => ({
      ...s,
      taskEnd: end,
      rounds: s.rounds.map((r, i) =>
        i === s.current
          ? { ...r, seconds: Math.round((end - s.taskStart) / 100) / 10 }
          : r,
      ) as StudyState["rounds"],
    }));
  }, [complete, study.phase, study.taskEnd, study.taskStart, setStudy]);
  useEffect(() => {
    if (study.phase !== "task" || !study.taskEnd) return;
    const timer = window.setTimeout(
      () => setStudy((s) => ({ ...s, phase: "rating" })),
      RATING_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [study.phase, study.taskEnd, setStudy]);

  async function begin() {
    setBusy(true);
    purchasedAt.current = 0;
    await reset("fresh");
    go("/", "Home", true);
    setStudy((s) => ({
      ...s,
      phase: "task",
      taskStart: Date.now(),
      taskEnd: 0,
    }));
    setBusy(false);
  }
  async function send(s: StudyState) {
    setUpload("sending");
    const ok = await uploadStudy(s);
    setUpload(ok ? "sent" : "failed");
    if (ok) setStudy((x) => ({ ...x, uploaded: true }));
  }
  function submitRating() {
    const rounds = study.rounds.map((r, i) =>
      i === study.current ? { ...r, rating, comment: comment.trim() } : r,
    ) as StudyState["rounds"];
    setRating(0);
    setComment("");
    if (study.current === 0)
      setStudy((s) => ({
        ...s,
        rounds,
        current: 1,
        phase: "intro",
        taskStart: 0,
        taskEnd: 0,
      }));
    else {
      const finished = { ...study, rounds, phase: "done" as const };
      setStudy(() => finished);
      void send(finished);
    }
  }

  if (study.phase === "task") return null;
  const seconds = round.seconds ?? 0;
  return (
    <div className="study" role="dialog" aria-modal="true">
      <div className="study-card">
        {study.phase === "intro" && (
          <>
            <span className="eyebrow">TASK {study.current + 1} OF 2</span>
            <h2>
              {study.current === 0 ? "Share a split" : "Now do it once more"}
            </h2>
            <p>
              {study.current === 0
                ? "Imagine you bought a bulk pack and want to split it with a neighbour."
                : "You’ll do the same task again, this time on a slightly different version of the app."}
            </p>
            <ol>
              <li>
                Share a split for <strong>Oat milk (1 L)</strong> from
                FairPrice: a pack of <strong>6</strong> for{" "}
                <strong>S$12.00</strong>, sharing <strong>2</strong>. Choose any
                pickup point, day and time.
              </li>
              <li>
                A neighbour will join automatically. Buy the pack, then hand it
                over; the pickup code is scanned for you.
              </li>
            </ol>
            <p className="fine">
              Your time starts when you tap the button and stops when the split
              completes. Work as you normally would.
            </p>
            <Button disabled={busy} onClick={begin}>
              {busy ? "Getting ready…" : "Start task"}
            </Button>
          </>
        )}
        {study.phase === "rating" && (
          <>
            <span className="eyebrow">TASK {study.current + 1} COMPLETE</span>
            <h2>Tell us about that version</h2>
            <p>Overall, how easy was it to use this version of the app?</p>
            <div className="likert" role="radiogroup" aria-label="Ease of use">
              {likert.map((label, i) => (
                <button
                  key={label}
                  role="radio"
                  aria-checked={rating === i + 1}
                  aria-label={`${i + 1}, ${label}`}
                  className={rating === i + 1 ? "on" : ""}
                  onClick={() => setRating(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="likert-ends">
              <small>1 · Very difficult</small>
              <small>5 · Very easy</small>
            </div>
            <label className="study-comment">
              What did you like or find frustrating? What would you change?
              <textarea
                rows={4}
                maxLength={2000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>
            <Button
              disabled={!rating || !comment.trim()}
              onClick={submitRating}
            >
              {study.current === 0 ? "Next task" : "Submit"}
            </Button>
            <p className="fine">Task time: {seconds.toFixed(1)}s</p>
          </>
        )}
        {study.phase === "done" && (
          <>
            <span className="eyebrow">ALL DONE</span>
            <h2>Thank you!</h2>
            {upload === "sending" && <p>Saving your responses…</p>}
            {upload === "sent" && <p>Your responses have been recorded.</p>}
            {upload === "failed" && (
              <>
                <p>
                  {SHEETS_URL
                    ? "We couldn’t save your responses. Check your connection and try again."
                    : "Responses couldn’t be uploaded (no spreadsheet connected)."}
                </p>
                <Button onClick={() => send(study)}>Try again</Button>
                <Button
                  kind="secondary"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(
                      new Blob([studyCsv(study)], { type: "text/csv" }),
                    );
                    a.download = `sharelah-${study.participant}.csv`;
                    a.click();
                  }}
                >
                  Download my responses
                </Button>
              </>
            )}
            <p className="fine">You can close this tab now.</p>
          </>
        )}
      </div>
    </div>
  );
}
