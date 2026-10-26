import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Camera as CameraIcon,
  SwitchCamera,
  Zap,
  Upload,
  ScanLine,
} from "lucide-react";
import { compressPhoto, decodeQR, imageDataFromFile } from "./qr";
/** What the simulated AR overlay "recognises" on the shelf. */
export type ArPriceTag = { title: string; deal: string; unit: string };
const AR_LOCK_MS = 1600;

export function Camera({
  mode,
  ar,
  extra,
  onPhoto,
  onCode,
}: {
  mode: "photo" | "qr";
  /** Simulated AR: shows this tag's per-item price over the live feed. */
  ar?: ArPriceTag;
  /** Another way to supply a photo, shown beside "Choose a photo". */
  extra?: ReactNode;
  onPhoto?: (blob: Blob) => void;
  onCode?: (code: string) => boolean;
}) {
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    generation = useRef(0),
    handler = useRef(onCode),
    file = useRef<HTMLInputElement>(null);
  handler.current = onCode;
  const [facing, setFacing] = useState<"environment" | "user">("environment"),
    [running, setRunning] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [flash, setFlash] = useState(false),
    [canFlash, setCanFlash] = useState(false),
    [attempt, setAttempt] = useState(0),
    [arLocked, setArLocked] = useState(false);
  // Simulated AR: nothing is read from the feed. A moment after the camera
  // opens, the overlay "finds" the sample price tag and shows the unit price.
  const showAr = !!ar && mode === "photo" && running;
  useEffect(() => {
    setArLocked(false);
    if (!showAr) return;
    const timer = window.setTimeout(() => setArLocked(true), AR_LOCK_MS);
    return () => window.clearTimeout(timer);
  }, [showAr, facing]);
  function stop() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setRunning(false);
  }
  useEffect(() => {
    const id = ++generation.current;
    let timer: number | undefined,
      cancelled = false;
    setError("");
    setRunning(false);
    setFlash(false);
    setCanFlash(false);
    async function start() {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
          throw Error(
            "Camera access needs HTTPS (or localhost). You can still choose a photo or enter a pickup code.",
          );
        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled || id !== generation.current) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        video.current!.srcObject = s;
        await video.current!.play();
        if (cancelled || id !== generation.current) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setRunning(true);
        setCanFlash(
          !!(
            (s.getVideoTracks()[0].getCapabilities?.() ||
              {}) as MediaTrackCapabilities & { torch?: boolean }
          ).torch,
        );
        if (mode === "qr") void scan();
      } catch (e) {
        if (cancelled || id !== generation.current) return;
        stream.current?.getTracks().forEach((t) => t.stop());
        stream.current = null;
        const name = (e as Error).name;
        setError(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access in your browser settings and try again, or upload a QR photo."
            : name === "NotFoundError"
              ? "No camera was found. Choose a QR photo or enter the pickup code."
              : name === "NotReadableError"
                ? "Your camera is being used by another app. Close it and try again."
                : (e as Error).message,
        );
      }
    }
    async function scan() {
      if (
        cancelled ||
        id !== generation.current ||
        !stream.current ||
        !video.current
      )
        return;
      const v = video.current;
      if (v.readyState >= 2 && v.videoWidth) {
        const c = document.createElement("canvas");
        const ratio = Math.min(1, 800 / v.videoWidth);
        c.width = v.videoWidth * ratio;
        c.height = v.videoHeight * ratio;
        const ctx = c.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(v, 0, 0, c.width, c.height);
        try {
          const code = await decodeQR(
            ctx.getImageData(0, 0, c.width, c.height),
          );
          if (!cancelled && id === generation.current && code) {
            if (handler.current?.(code)) {
              stop();
              return;
            }
            setError(
              "This code does not match this split. Ask the host to show the correct pickup code.",
            );
          }
        } catch {
          if (!cancelled)
            setError(
              "Could not read the QR code. Try a clearer photo or enter the 6-digit code.",
            );
        }
      }
      if (!cancelled && id === generation.current)
        timer = window.setTimeout(scan, 350);
    }
    const visibility = () => {
      if (document.hidden) {
        generation.current++;
        stop();
      } else setAttempt((n) => n + 1);
    };
    document.addEventListener("visibilitychange", visibility);
    void start();
    return () => {
      cancelled = true;
      generation.current++;
      if (timer) clearTimeout(timer);
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [facing, attempt, mode]);
  async function capture() {
    if (!video.current?.videoWidth) return;
    setBusy(true);
    try {
      const v = video.current,
        c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext("2d")!.drawImage(v, 0, 0);
      const blob = await new Promise<Blob>((res, rej) =>
        c.toBlob(
          (b) => (b ? res(b) : rej(Error("Could not capture photo."))),
          "image/jpeg",
          0.85,
        ),
      );
      const result = await compressPhoto(blob);
      stop();
      onPhoto?.(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(blob?: File) {
    if (!blob) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "qr") {
        const code = await decodeQR(await imageDataFromFile(blob));
        if (!code || !handler.current?.(code))
          throw Error(
            "No matching pickup QR code found. Try a sharper photo or enter the code.",
          );
        stop();
      } else {
        const result = await compressPhoto(blob);
        stop();
        onPhoto?.(result);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  }
  return (
    <div className="camera">
      <div className="viewfinder">
        <video ref={video} muted playsInline aria-label="Live camera preview" />
        <div className={"camera-guide" + (arLocked ? " locked" : "")}>
          {!arLocked && <ScanLine size={44} />}
          <span>
            {mode === "qr"
              ? "Keep the host’s QR code inside the frame"
              : arLocked
                ? "Price tag found · take a photo to use it"
                : "Fit the item and price tag inside the frame"}
          </span>
        </div>
        {showAr && (
          <div className="ar-layer" aria-live="polite">
            {arLocked ? (
              <div className="ar-tag" role="status">
                <small>{ar.title}</small>
                <span className="ar-deal">{ar.deal}</span>
                <strong>
                  {ar.unit}
                  <em> each</em>
                </strong>
              </div>
            ) : (
              <span className="ar-scanning">Looking for a price tag…</span>
            )}
          </div>
        )}
        {!running && !error && (
          <span className="camera-loading">Opening camera…</span>
        )}
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button
            className="text-button"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Try camera again
          </button>
        </div>
      )}
      <div className="camera-tools">
        <button
          className="secondary"
          onClick={() =>
            setFacing((f) => (f === "environment" ? "user" : "environment"))
          }
          disabled={!running}
          aria-label="Switch camera"
        >
          <SwitchCamera size={21} />
        </button>
        {mode === "photo" && (
          <button
            className="primary capture"
            disabled={!running || busy}
            onClick={() => void capture()}
          >
            <CameraIcon size={22} />
            Take photo
          </button>
        )}
        {canFlash && (
          <button
            className="secondary"
            aria-label="Toggle flash"
            aria-pressed={flash}
            onClick={async () => {
              try {
                await stream.current?.getVideoTracks()[0].applyConstraints({
                  advanced: [{ torch: !flash } as MediaTrackConstraintSet],
                });
                setFlash(!flash);
              } catch {
                setError("Flash is not available on this camera.");
              }
            }}
          >
            <Zap size={21} />
          </button>
        )}
      </div>
      <div className="camera-alt">
        <button
          className="secondary"
          onClick={() => file.current?.click()}
          disabled={busy}
        >
          <Upload size={19} />
          {busy ? "Reading photo…" : "Choose a photo"}
        </button>
        {extra}
      </div>
      <input
        ref={file}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void upload(e.target.files?.[0])}
      />
      <p className="fine">
        Your photos stay on your phone until you share them. No audio is
        recorded.
      </p>
    </div>
  );
}
