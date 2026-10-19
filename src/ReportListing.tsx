import { useState } from "react";
import { Flag } from "lucide-react";
import { Button, Sheet } from "./ui";
import { useStore } from "./store";
import { reportListing, reportReasons } from "./model";

/** What is being reported, in the words the page around it uses. */
export type ReportNoun = "split" | "deal";

/** Report a split or spotted deal that looks fake, expired or wrong. */
export function ReportSheet({
  reportKey,
  title,
  noun,
  close,
}: {
  reportKey: string;
  title: string;
  noun: ReportNoun;
  close: () => void;
}) {
  const { state, update } = useStore(),
    existing = state.reports?.[reportKey],
    [reason, setReason] = useState(existing?.reason || ""),
    [note, setNote] = useState(existing?.note || ""),
    [sent, setSent] = useState(false);
  if (sent)
    return (
      <Sheet
        title="Thanks for flagging this"
        onClose={close}
        footer={<Button onClick={close}>Done</Button>}
      >
        <p>
          We’ll check “{title}”. A {noun} with several reports is hidden while
          it’s reviewed, and the{" "}
          {noun === "split" ? "host" : "person who posted it"} is asked to
          confirm the details.
        </p>
        <p className="fine">
          They won’t see who reported it. In this demo, reports are saved only
          on this device.
        </p>
      </Sheet>
    );
  return (
    <Sheet
      title={existing ? "Update your report" : `Report this ${noun}`}
      onClose={close}
      footer={
        <>
          <Button
            disabled={!reason || (reason === "Something else" && !note.trim())}
            onClick={() => {
              update((s) => reportListing(s, reportKey, reason, note));
              setSent(true);
            }}
          >
            {existing ? "Update report" : "Submit report"}
          </Button>
          {existing && (
            <Button
              kind="secondary"
              onClick={() => {
                update((s) => reportListing(s, reportKey, ""));
                close();
              }}
            >
              Withdraw report
            </Button>
          )}
        </>
      }
    >
      <p className="muted">What’s wrong with “{title}”?</p>
      <fieldset className="report-reasons">
        <legend className="sr-only">Reason</legend>
        {reportReasons.map(([r, detail]) => (
          <label className="choice report-reason" key={r}>
            <input
              type="radio"
              name="report-reason"
              checked={reason === r}
              onChange={() => setReason(r)}
            />
            <span>
              <strong>{r}</strong>
              <small>{detail}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <label>
        Details{" "}
        <small>
          {reason === "Something else" ? "(required)" : "(optional)"}
        </small>
        <textarea
          maxLength={1000}
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. The promotion ended on Sunday, or the photo is from another store."
        />
      </label>
    </Sheet>
  );
}

/** Shown on a split or deal this tester has already reported. */
export function ReportedNotice({
  reportKey,
  edit,
}: {
  reportKey: string;
  edit: () => void;
}) {
  const report = useStore().state.reports?.[reportKey];
  if (!report) return null;
  return (
    <div className="notice reported-notice" role="status">
      <Flag size={18} aria-hidden="true" />
      <span>
        You reported this as <strong>{report.reason.toLowerCase()}</strong>.
        It’s under review.
      </span>
      <button className="text-button" onClick={edit}>
        Edit
      </button>
    </div>
  );
}

export function ReportButton({
  onClick,
  reported,
  noun,
}: {
  onClick: () => void;
  reported: boolean;
  noun: ReportNoun;
}) {
  return (
    <button
      className="report-link"
      onClick={onClick}
      aria-label={reported ? "Edit your report" : `Report this ${noun}`}
    >
      <Flag
        size={16}
        aria-hidden="true"
        fill={reported ? "currentColor" : "none"}
      />
      {reported ? "Reported" : "Report"}
    </button>
  );
}
