import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Landing, landingRoute } from "./Landing";
import { Scanning, scanningRoute } from "./Scanning";
import "./styles/index.css";
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="fatal">
        <h1>Let’s get you back.</h1>
        <p>The app ran into a problem. Your splits and messages are safe.</p>
        <button onClick={() => location.reload()}>Reload ShareLah</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    {/* Stand-alone pages that skip the app entirely. */}
    {landingRoute() ? <Landing /> : scanningRoute() ? <Scanning /> : <App />}
  </ErrorBoundary>,
);
