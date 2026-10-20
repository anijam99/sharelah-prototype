import type { CreateVariant } from "./Create";

/**
 * Within-subjects A/B study. /a runs UI A (step by step) then UI B (one page);
 * /b runs B then A. Progress lives in localStorage so a refresh resumes it.
 */
export type StudyRoute = "a" | "b";
export type Round = { ui: CreateVariant; seconds?: number; rating?: number };
export type Study = {
  participant: string;
  route: StudyRoute;
  startedAt: string;
  /** Index into rounds of the one in progress. */
  current: number;
  phase: "intro" | "task" | "rating" | "done";
  /** Epoch ms when the current task started; 0 until the participant begins. */
  taskStart: number;
  /** Epoch ms when the current split completed; 0 while in progress. */
  taskEnd: number;
  rounds: [Round, Round];
  uploaded: boolean;
};

const KEY = "sharelah-study-v1";

export const studyRoute = (pathname = location.pathname): StudyRoute | null => {
  const m = /^\/(a|b)\/?$/i.exec(pathname);
  return m ? (m[1].toLowerCase() as StudyRoute) : null;
};

export function newStudy(route: StudyRoute): Study {
  const order: CreateVariant[] = route === "a" ? ["A", "B"] : ["B", "A"];
  return {
    participant: crypto.randomUUID().slice(0, 8),
    route,
    startedAt: new Date().toISOString(),
    current: 0,
    phase: "intro",
    taskStart: 0,
    taskEnd: 0,
    rounds: [{ ui: order[0] }, { ui: order[1] }],
    uploaded: false,
  };
}

export function loadStudy(route: StudyRoute): Study {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "null");
    // Resume only an unfinished session on the same link; otherwise start anew.
    if (value?.route === route && value.phase !== "done") return value;
  } catch {}
  return newStudy(route);
}

export function saveStudy(study: Study) {
  try {
    localStorage.setItem(KEY, JSON.stringify(study));
  } catch {}
}

/** One spreadsheet row per participant. */
export function studyRow(s: Study) {
  const of = (ui: CreateVariant) => s.rounds.find((r) => r.ui === ui)!;
  return {
    timestamp: new Date().toISOString(),
    participant_id: s.participant,
    route: "/" + s.route,
    first_ui: s.rounds[0].ui,
    second_ui: s.rounds[1].ui,
    ui_a_time_sec: of("A").seconds ?? "",
    ui_a_satisfaction: of("A").rating ?? "",
    ui_b_time_sec: of("B").seconds ?? "",
    ui_b_satisfaction: of("B").rating ?? "",
    user_agent: navigator.userAgent,
  };
}

/** The Apps Script web app that appends rows to the Google Sheet. */
export const SHEETS_URL: string = import.meta.env.VITE_SHEETS_URL || "";

/** Resolves true once the request has been sent; the response is opaque (no-cors). */
export async function uploadStudy(s: Study) {
  if (!SHEETS_URL) return false;
  try {
    await fetch(SHEETS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(studyRow(s)),
    });
    return true;
  } catch {
    return false;
  }
}

export function studyCsv(s: Study) {
  const row = studyRow(s);
  const cell = (v: unknown) => `"${String(v).replaceAll('"', '""')}"`;
  return (
    Object.keys(row).join(",") + "\n" + Object.values(row).map(cell).join(",")
  );
}
