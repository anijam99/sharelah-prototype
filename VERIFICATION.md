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

## Mobile layout, maps and reservation grace period (12 October 2026)

- `npm run build` passes, including TypeScript and production assets.
- `npm test`: 24 tests pass. Added checks for five-second expiry, cancelling before expiry without taking availability, preserving the deadline when the screen remounts, and leaving the screen without creating a reservation.
- Manually checked the running development app in Zen at a 390px iframe width: compact headers, real OpenStreetMap tiles, price-pin selection, countdown ring and number, pinned cancel action, and automatic transition to the reservation. Cancelled the simulated reservation created by this check.
- Playwright coverage was extended for compact headers, early cancellation, tile rendering, attribution, selection, zoom and pickup maps. The end-to-end suite could not run in this sandbox: opening the dev-server socket and launching headless Chromium are denied. These tests remain to be run outside the sandbox.
- Real phone checks remain necessary for safe-area insets, Safari/Android touch panning, keyboard behavior and motion preferences. Tiles need an internet connection; pickup points and distances are demo data.

## Supplied deal photo collection (13 October 2026)

- Visually inspected all 12 source images, including enlarged shelf labels and secondary promotions. `DEAL_PHOTO_REVIEW.md` records 48 catalogue entries and uncertain or omitted details.
- `npm run build` passes. `npm test`: 29 tests pass, including source-image coverage, linked asset existence, distinct offer IDs, multibuy arithmetic, catalogue search, split prefill, unpriced promotions and migration of older saved demos.
- Manually checked Home → View all spotted deals, catalogue search for Carefree, source-image rendering, the 2-for-S$3.90 price, offer terms and the split action in the running Zen browser.
- Optimized all 12 bundled images to about 4.4 MB combined. Images load lazily and work as static source photos throughout split creation.
- Existing browser-test restrictions still apply; no automated end-to-end result is claimed for this change.

## Two personas, written reviews and neighbour profiles (13 October 2026)

- All seeded hosts and simulated neighbours are Jerry; the tester and their hosted listings use Tom. Older local state is normalized while preserving product IDs, reservations, saved items, messages and reviews.
- Written review UI supports an optional 1,000-character comment alongside stars, saves only for completed splits, preserves the existing review when editing, and displays submissions in the neighbour’s aggregated profile.
- `npm test`: 34 tests pass. New checks cover old-persona migration, profile navigation, full pickup → review → profile flow, reload persistence, review editing without duplication, rating validation, comment limits and combined rating arithmetic.
- Manually verified the offer host row opens Jerry’s profile with biography, stats, sample written reviews and all three seeded listings in Zen. Review-author links and written review persistence are covered by app tests.
- Browser-test sandbox restrictions still apply. Reviews are local to this prototype browser and seeded reviews are marked as samples.
