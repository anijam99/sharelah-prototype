import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";
import { useStore } from "./store";
import { go } from "./router";
import { collectJoiner, hostedComplete, type Product } from "./model";
import {
  loadStudy,
  saveStudy,
  studyCsv,
  uploadStudy,
  SHEETS_URL,
  themes,
  ageGroups,
  occupations,
  type Narration,
  type Study as StudyState,
  type StudyRoute,
  type Round,
  type Theme,
} from "./studyData";
import { VALIDATION_EVENT, type CreateVariant } from "./Create";

const names: Record<CreateVariant, string> = {
  A: "step by step",
  B: "one page",
};
/** The task, worded identically on the intro screen and the side panel. */
function TaskText({ round }: { round: number }) {
  return (
    <>
      <p>
        {round === 0
          ? "Imagine you bought a bulk pack and want to split it with a neighbour."
          : "You’ll do the same task again, this time on a slightly different version of the app."}
      </p>
      <ol>
        <li>
          Tap the <strong>Share</strong> icon and start a split from a price tag
          by <strong>taking a picture</strong> of any price tag.
        </li>
        <li>
          Share a split for <strong>TOP liquid laundry detergent</strong> from
          FairPrice: 2 bottles for <strong>S$21.00</strong>, sharing{" "}
          <strong>1</strong>. Tap the <strong>Demo autofill</strong> button to
          prefill the details, then choose any pickup point, day and time, and
          publish.
        </li>
        <li>
          When a neighbour asks to join, <strong>accept</strong> them, then
          follow the <strong>In real life</strong> notes to buy the bundle and
          hand it over.
        </li>
      </ol>
    </>
  );
}
/** How each layout is described when asking which one people preferred. */
const layoutHint: Record<CreateVariant, string> = {
  A: "Several short screens, one step at a time",
  B: "Everything on one scrolling page",
};
/** Update the round in progress. */
function withRound(
  s: StudyState,
  change: Partial<Round> | ((r: Round) => Partial<Round>),
): StudyState {
  return {
    ...s,
    rounds: s.rounds.map((r, i) =>
      i === s.current
        ? { ...r, ...(typeof change === "function" ? change(r) : change) }
        : r,
    ) as StudyState["rounds"],
  };
}
const RATING_DELAY_MS = 5000, // Let them see the completed split before the survey.
  /** Let people see the new screen before the pop-up explains it. */
  NARRATION_DELAY_MS = 5000,
  SCAN_MS = 1500;

/** What happens in real life at each of Jerry's steps. */
const narrations: Record<Narration, { title: string; body: string }> = {
  purchase: {
    title: "Time to buy the bundle",
    body: "Pretend you've gone to FairPrice and bought the 2-bottle bundle. When you're done, tap Mark purchased & notify.",
  },
  scan: {
    title: "Jerry is on his way",
    body: "Jerry meets you at the pickup point and collects the bottle you bought for him. He then scans the pickup code on your screen, and once it’s scanned, the split is complete. Tap OK to see the scan happen.",
  },
};
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
  path,
}: {
  path: string;
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
    [preferred, setPreferred] = useState<CreateVariant | "none">(),
    [picked, setPicked] = useState<Theme[]>([]),
    [why, setWhy] = useState(""),
    [showing, setShowing] = useState<Narration | null>(null),
    [age, setAge] = useState(study.age || ""),
    [occupation, setOccupation] = useState(study.occupation || "");
  const mine = state.products.find(hostedByParticipant);

  // Task time runs from choosing "Start a split" (from a price tag or
  // manually) until the split is published: the part where A and B differ.
  useEffect(() => {
    if (
      study.phase === "task" &&
      !study.taskStart &&
      (path.startsWith("/create") || path.startsWith("/capture"))
    )
      setStudy((s) =>
        withRound({ ...s, taskStart: Date.now() }, { pages: 1, errors: 0 }),
      );
  }, [study.phase, study.taskStart, path, setStudy]);
  useEffect(() => {
    if (
      study.phase !== "task" ||
      !study.taskStart ||
      study.publishedAt ||
      !mine
    )
      return;
    const at = Date.now();
    setStudy((s) =>
      withRound(
        { ...s, publishedAt: at },
        { seconds: Math.round((at - s.taskStart) / 100) / 10 },
      ),
    );
  }, [mine, study.phase, study.taskStart, study.publishedAt, setStudy]);

  // While timing, count each new screen and each blocked Next/Publish tap.
  const counting =
      study.phase === "task" && !!study.taskStart && !study.publishedAt,
    lastPath = useRef(path);
  useEffect(() => {
    if (counting && path !== lastPath.current)
      setStudy((s) => withRound(s, (r) => ({ pages: (r.pages || 0) + 1 })));
    lastPath.current = path;
  }, [counting, path, setStudy]);
  useEffect(() => {
    if (!counting) return;
    const blocked = () =>
      setStudy((s) => withRound(s, (r) => ({ errors: (r.errors || 0) + 1 })));
    window.addEventListener(VALIDATION_EVENT, blocked);
    return () => window.removeEventListener(VALIDATION_EVENT, blocked);
  }, [counting, setStudy]);

  // After publishing, each of Jerry's steps gets an "in real life" pop-up,
  // 5 seconds after the screen changes so people see it first.
  const jerry = mine
      ? (state.joinRequests[mine.id] || []).find((r) => r.person === "jerry")
      : undefined,
    accepted = jerry?.status === "accepted",
    done = study.narrated || [],
    next: Narration | null =
      study.phase !== "task" || study.taskEnd || !mine
        ? null
        : accepted && !mine.purchased && !done.includes("purchase")
          ? "purchase"
          : accepted && mine.purchased && !done.includes("scan")
            ? "scan"
            : null;
  useEffect(() => {
    setShowing(null);
    if (!next) return;
    const timer = window.setTimeout(() => setShowing(next), NARRATION_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [next]);
  function acknowledge(step: Narration) {
    setShowing(null);
    setStudy((s) => ({ ...s, narrated: [...(s.narrated || []), step] }));
    // Jerry's scan only happens once they've read what it means.
    if (step === "scan" && mine)
      window.setTimeout(
        () => update((s) => collectJoiner(s, mine.id, "jerry")),
        SCAN_MS,
      );
  }

  // The round ends when Jerry has collected; then ask for the rating.
  const complete = !!mine && hostedComplete(state, mine);
  useEffect(() => {
    if (study.phase !== "task" || study.taskEnd || !complete) return;
    setStudy((s) => ({ ...s, taskEnd: Date.now() }));
  }, [complete, study.phase, study.taskEnd, setStudy]);
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
    await reset("seeded");
    go("/", "Home", true);
    setStudy((s) => ({
      ...s,
      phase: "task",
      taskStart: 0,
      taskEnd: 0,
      narrated: [],
      publishedAt: 0,
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
    else setStudy((s) => ({ ...s, rounds, phase: "compare" }));
  }
  function submitCompare() {
    const finished: StudyState = {
      ...study,
      preferred,
      themes: picked,
      preferenceComment: why.trim(),
      completedAt: new Date().toISOString(),
      phase: "done",
    };
    setStudy(() => finished);
    void send(finished);
  }

  if (study.phase === "task")
    return showing ? (
      <div
        className="narration"
        role="dialog"
        aria-modal="true"
        aria-labelledby="narration-title"
      >
        {/* Styled like an iOS system alert so it reads as "outside" the app. */}
        <div className="ios-alert">
          <div className="ios-alert-text">
            <h2 id="narration-title">{narrations[showing].title}</h2>
            <p>{narrations[showing].body}</p>
          </div>
          <button onClick={() => acknowledge(showing)}>OK</button>
        </div>
      </div>
    ) : null;
  const seconds = round.seconds ?? 0;
  return (
    <div className="study" role="dialog" aria-modal="true">
      <div className="study-card">
        {study.phase === "welcome" && (
          <>
            <span className="eyebrow">WELCOME</span>
            <h2>Hello, and thank you for joining us!</h2>
            <p>
              Today you’ll try an early version of <strong>ShareLah</strong>, an
              app for splitting bulk buys with neighbours. When a shop has a “2
              for S$21” deal but you only need one, ShareLah helps you find
              someone nearby to share it with, so nobody overbuys or pays full
              price.
            </p>
            <p>
              We’re testing the app, not you. There are no right or wrong
              answers, and anything confusing is exactly what we want to hear
              about. It takes about 10 minutes, and your answers are anonymous.
            </p>
            <Button
              onClick={() => setStudy((s) => ({ ...s, phase: "profile" }))}
            >
              Get started
            </Button>
          </>
        )}
        {study.phase === "profile" && (
          <>
            <span className="eyebrow">BEFORE WE START</span>
            <h2>A little about you</h2>
            <fieldset className="about-you">
              <legend className="sr-only">About you</legend>
              <label>
                Age
                <select value={age} onChange={(e) => setAge(e.target.value)}>
                  <option value="" disabled>
                    Choose…
                  </option>
                  {ageGroups.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>
              <label>
                Occupation
                <select
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {occupations.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            </fieldset>
            <Button
              disabled={!age || !occupation}
              onClick={() =>
                setStudy((s) => ({
                  ...s,
                  age,
                  occupation,
                  phase: "intro",
                }))
              }
            >
              Continue
            </Button>
          </>
        )}
        {study.phase === "intro" && (
          <>
            <span className="eyebrow">TASK {study.current + 1} OF 2</span>
            <h2>
              {study.current === 0 ? "Share a split" : "Now do it once more"}
            </h2>
            {study.current === 0 && (
              <div className="study-background">
                <strong>Background</strong>
                <p>
                  In ShareLah, a host buys a bundle and shares part of it.
                  Neighbours ask to join, the host accepts them, buys the
                  bundle, and hands each portion over at a pickup point by
                  scanning a code. In this task, you’re the host and Jerry is
                  your neighbour.
                </p>
              </div>
            )}
            <TaskText round={study.current} />
            <p className="fine">
              These instructions stay visible beside the app. Work as you
              normally would. The task ends by itself once Jerry has collected
              his portion.
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
              {study.current === 0 ? "Next task" : "Continue"}
            </Button>
            <p className="fine">Task time: {seconds.toFixed(1)}s</p>
          </>
        )}
        {study.phase === "compare" && (
          <>
            <span className="eyebrow">LAST QUESTION</span>
            <h2>Which version would you use?</h2>
            <p>
              You shared a split twice. The two versions differed only in how
              the form was laid out.
            </p>
            <div
              className="preference"
              role="radiogroup"
              aria-label="Preferred version"
            >
              {study.rounds.map((r, i) => (
                <button
                  key={r.ui}
                  role="radio"
                  aria-checked={preferred === r.ui}
                  className={preferred === r.ui ? "on" : ""}
                  onClick={() => setPreferred(r.ui)}
                >
                  <strong>The {i === 0 ? "first" : "second"} version</strong>
                  <small>{layoutHint[r.ui]}</small>
                </button>
              ))}
              <button
                role="radio"
                aria-checked={preferred === "none"}
                className={preferred === "none" ? "on" : ""}
                onClick={() => {
                  setPreferred("none");
                  setPicked([]);
                }}
              >
                <strong>No preference</strong>
              </button>
            </div>
            {preferred && preferred !== "none" && (
              <fieldset className="themes">
                <legend>What made it better? Choose any that apply.</legend>
                <div className="chips wrap">
                  {(Object.keys(themes) as Theme[]).map((t) => (
                    <button
                      key={t}
                      className={
                        "chip" + (picked.includes(t) ? " selected" : "")
                      }
                      aria-pressed={picked.includes(t)}
                      onClick={() =>
                        setPicked((p) =>
                          p.includes(t) ? p.filter((x) => x !== t) : [...p, t],
                        )
                      }
                    >
                      {themes[t]}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {preferred && (
              <label className="study-comment">
                {preferred === "none"
                  ? "Did anything feel different between the two?"
                  : picked.length
                    ? `You picked: ${picked.map((t) => themes[t]).join(", ")}. What made it feel that way?`
                    : "Tell us more about why."}
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                />
              </label>
            )}
            <Button
              disabled={
                !preferred ||
                (preferred !== "none" && !picked.length) ||
                !why.trim()
              }
              onClick={submitCompare}
            >
              Submit
            </Button>
          </>
        )}
        {study.phase === "done" && (
          <>
            <span className="eyebrow">ALL DONE</span>
            <h2>Thank you!</h2>
            <p>
              Thanks again for your time today. Your answers show us where
              ShareLah works and where it gets in the way, and they’ll shape the
              next version of the app.
            </p>
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

/** The task, kept in view beside the app for the whole session. */
export function StudyPanel({
  study,
  compact,
}: {
  study: StudyState;
  compact: boolean;
}) {
  const heading = `Task ${Math.min(2, study.current + 1)} of 2`;
  return compact ? (
    <details className="study-panel compact">
      <summary>{heading} · view instructions</summary>
      <TaskText round={study.current} />
    </details>
  ) : (
    <aside className="study-panel" aria-label="Task instructions">
      <span className="eyebrow">{heading}</span>
      <h2>{study.current === 0 ? "Share a split" : "Now do it once more"}</h2>
      <TaskText round={study.current} />
    </aside>
  );
}
