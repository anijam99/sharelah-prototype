# Verification record

Implementation checked on 12 October 2026.

## Completed

- `npm run build`: TypeScript and Vite production build passed. Runtime artwork, original icon paths, QR modules, WASM, printable pickup cards and license notices are included in the output.
- `npm test`: **21 checks passed** across six suites. Nine domain checks cover initial ownership, duplicate holds, cancellation and availability, release confirmation, reports, matching codes, closed/owned/full listings, integer-cent allocation, and filtering. Seven rendered React interaction checks cover Home/Map ownership, payment choice and reservation sheets, cancellation, wrong-code handling and receipt confirmation, report guards, persisted chat, listing creation/reset, and camera-denied reporting. Two simulated MediaStream checks cover lens switching/unmount cleanup and a late permission grant after leaving the screen. One roundtrip check generates and decodes a real QR through the packaged encoder and WASM.
- Native browser local-file review: desktop Home and a 390-pixel mobile viewport rendered successfully. Original transparent vector artwork and all bottom-navigation icons were checked. The map was panned in both axes and recentered; the owned yoghurt pin and membership card remained visible. This review used the production bundle with local asset paths substituted in a temporary file.
- QR development regression: the actual QR component renders successfully, and Vite transforms the encoder, decoder and their source imports in middleware mode with no HTTP or WebSocket listener. The JavaScript modules now live in `src/vendor/` and are bundled into separate production chunks; only the fetched WASM binary stays in `public/vendor/`.
- `npx playwright test --list`: browser suite loads and discovers the three mobile Chromium scenarios. This only validates test discovery; it does not execute them.

- Single-command development setup: `npm run dev` installed all 132 dependencies in a clean test folder, handled unavailable font downloads with a fallback, and reached Vite startup. Server binding was then blocked by this environment (`EPERM`), as noted below.

## Environment-dependent checks still required

- Coolify deployment: Docker is not installed in this execution environment. The Dockerfile build, container health and HTTPS routing must be checked when Coolify deploys the GitHub repository.
- Real HTTP browser automation: this environment rejected local server binding (`EPERM`) and a headless browser launch. The included Playwright suite has not been executed here. Run it on your machine or against the hosted URL as described in README.
- Physical camera, torch and image capture: not tested on hardware. Permission/error handling and stream cleanup have automated coverage using simulated browser APIs; scan decoding has coverage with a real QR image buffer. Test live printed-code scanning, shelf capture, rotation and backgrounding on the actual iPhone/Android phones over HTTPS before conducting the study.
- Typography: the initial visual review used system-font fallbacks. The original Inter and Bricolage Grotesque files and OFL licenses are now present and included in the production build.

## Intentional prototype behaviour

Data is isolated per browser, as requested. Payments, neighbour participation, notification delivery and support outcomes are simulated. Reports and chat are saved locally. The map is the original illustrated Figma neighbourhood map. Deal photographs are captured locally and details are entered manually; OCR, a live marketplace backend and shared chat are outside this prototype.

The app includes explicit receipt confirmation, guarded state transitions, contextual Back links, accessible native modal sheets, reduced-motion support, mobile safe-area layout, 16-pixel form fields and camera fallbacks. These are implementation checks, not a substitute for observing participant behaviour in a usability study.
