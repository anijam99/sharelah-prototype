import type { CreateVariant } from "./Create";

/**
 * Within-subjects A/B study. /a runs UI A (step by step) then UI B (one page);
 * /b runs B then A. Progress lives in localStorage so a refresh resumes it.
 */
export type StudyRoute = "a" | "b";
export type Round = {
  ui: CreateVariant;
  seconds?: number;
  /** Screens visited during the task, counting the first create screen. */
  pages?: number;
  /** Times a Next/Publish tap was blocked by a validation message. */
  errors?: number;
  /** Ease of use, 1–5. */
  rating?: number;
  comment?: string;
};
export type Study = {
  participant: string;
  route: StudyRoute;
  startedAt: string;
  /** Index into rounds of the one in progress. */
  current: number;
  phase:
    | "welcome"
    | "profile"
    | "intro"
    | "task"
    | "rating"
    | "compare"
    | "post"
    | "done";
  /** Epoch ms when the current task started; 0 until the participant begins. */
  taskStart: number;
  /** Epoch ms when Jerry collected and the round ended; 0 while in progress. */
  taskEnd: number;
  rounds: [Round, Round];
  /** Asked once before task 1. */
  age?: string;
  occupation?: string;
  /** Confidence sharing a bulk buy through an app, 1–10, after both tasks. */
  postConfidence?: number;
  /** "In real life" pop-ups already acknowledged in this round. */
  narrated?: Narration[];
  /** Epoch ms when the split was published, which stops the task clock. */
  publishedAt?: number;
  /** After both tasks: which layout they'd use, why, and in their words. */
  preferred?: CreateVariant | "none";
  themes?: Theme[];
  preferenceComment?: string;
  completedAt?: string;
  uploaded: boolean;
};

/**
 * Reasons offered for the preferred version. Keys go to the spreadsheet for
 * analysis; labels are what participants read.
 */
export const themes = {
  Intuitive: "Easier to understand (intuitive)",
  Efficient: "Quicker to finish (efficient)",
  Layout: "Clearer layout (layout)",
  Convenient: "Less scrolling or tapping (convenient)",
  Recoverable: "Easier to check and fix details (recoverable)",
  Familiar: "Felt more familiar (familiar)",
  Modern: "Looked more modern (modern)",
  Other: "Something else",
} as const;
export type Theme = keyof typeof themes;

export const ageGroups = [
  "Under 18",
  "18–24",
  "25–34",
  "35–44",
  "45–54",
  "55–64",
  "65 or older",
  "Prefer not to say",
];
export const occupations = [
  "Student",
  "Tech / IT",
  "Business / finance",
  "Healthcare",
  "Education",
  "Retail / service",
  "Creative / design",
  "Trades / logistics",
  "Homemaker",
  "Retired",
  "Not working",
  "Other",
  "Prefer not to say",
];

/** Jerry's steps, each explained by an "in real life" pop-up. */
export type Narration = "purchase" | "scan";

/** Rough device details from the browser, so no one has to type them. */
export function deviceInfo(ua = navigator.userAgent) {
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "Other";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
      ? "Samsung Internet"
      : /CriOS|Chrome\//.test(ua)
        ? "Chrome"
        : /FxiOS|Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Other";
  const device = /iPad|Tablet/.test(ua)
    ? "Tablet"
    : /Mobi|iPhone|Android/.test(ua)
      ? "Mobile"
      : "Desktop";
  return { device, os, browser };
}

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
    phase: "welcome",
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
  const of = (ui: CreateVariant) => s.rounds.find((r) => r.ui === ui)!,
    device = deviceInfo();
  return {
    timestamp: new Date().toISOString(),
    participant_id: s.participant,
    age_group: s.age ?? "",
    occupation: s.occupation ?? "",
    post_confidence: s.postConfidence ?? "",
    route: "/" + s.route,
    first_ui: s.rounds[0].ui,
    second_ui: s.rounds[1].ui,
    ui_a_ease: of("A").rating ?? "",
    ui_a_comment: of("A").comment ?? "",
    ui_b_ease: of("B").rating ?? "",
    ui_b_comment: of("B").comment ?? "",
    ui_a_time_sec: of("A").seconds ?? "",
    ui_b_time_sec: of("B").seconds ?? "",
    ui_a_pages: of("A").pages ?? "",
    ui_b_pages: of("B").pages ?? "",
    ui_a_errors: of("A").errors ?? "",
    ui_b_errors: of("B").errors ?? "",
    preferred_version:
      s.preferred === "none" ? "No preference" : (s.preferred ?? ""),
    preference_themes: (s.themes || []).join("; "),
    preference_comment: s.preferenceComment ?? "",
    started_at: s.startedAt,
    completed_at: s.completedAt ?? "",
    total_duration_sec: s.completedAt
      ? Math.round((Date.parse(s.completedAt) - Date.parse(s.startedAt)) / 1000)
      : "",
    device_category: device.device,
    os: device.os,
    browser: device.browser,
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
