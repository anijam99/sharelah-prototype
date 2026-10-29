import { Camera } from "./Camera";
import { PITCH_SCANNED, PITCH_SPLIT } from "./pitch";

/** /scanning is a stand-alone QR scanner for the pitch demo. */
export const scanningRoute = (pathname = location.pathname) =>
  /^\/scanning\/?$/i.test(pathname);

/**
 * Scanning any QR code stands in for scanning the host's pickup code: it
 * opens the usual next screen for the neighbour, Confirm receipt, for the
 * coconut water split.
 */
function collect() {
  sessionStorage.setItem(PITCH_SCANNED, "1");
  // The receipt screen only opens for a code scanned in the last 30 minutes.
  sessionStorage.setItem(
    "sharelah-verified-" + PITCH_SPLIT,
    String(Date.now()),
  );
  location.assign("/pitch#/receipt/" + PITCH_SPLIT);
  return true;
}

export function Scanning() {
  return (
    <main className="scanning">
      <header className="scanning-header">
        <img src="/assets/brand.svg" width="28" height="28" alt="" />
        <h1>Scan the host’s pickup code</h1>
      </header>
      <p className="scanning-intro">
        Point your camera at the QR code on the host’s screen. It scans as soon
        as it’s in the frame.
      </p>
      <Camera mode="qr" anyCode onCode={collect} />
    </main>
  );
}
