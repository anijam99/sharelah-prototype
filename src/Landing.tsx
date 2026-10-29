import { useEffect, useState } from "react";
import { Pizza } from "./Pizza";

/** /landing shows only the splash screen, e.g. for a pitch or a poster. */
export const landingRoute = (pathname = location.pathname) =>
  /^\/landing\/?$/i.test(pathname);

/** How often the splash animation plays again. */
const REPLAY_MS = 5000;

/** Splash: the sharing pizza comes together, then the logo and tagline. */
export function Landing() {
  // Remounting the content restarts its CSS animations. With Reduce Motion
  // on there is nothing to replay, so it stays still.
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setRun((n) => n + 1), REPLAY_MS);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <main className="landing" aria-label="ShareLah" key={run}>
      <Pizza count={6} animate />
      <h1 className="wordmark landing-wordmark">
        <img src="/assets/brand.svg" width="44" height="44" alt="" />
        sharelah.
      </h1>
      <p className="landing-tagline">
        See a deal? No one to split with? <strong>ShareLah.</strong>
      </p>
    </main>
  );
}
