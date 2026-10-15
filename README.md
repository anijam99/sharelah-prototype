# ShareLah web prototype

A mobile-first, self-hosted implementation of the current orange-and-white [ShareLah Figma design](https://www.figma.com/design/ak4IecsfKTbnzfkWYzbOnK?node-id=2-86), with the original illustrations and icon paths. React + TypeScript + Vite, served by Nginx in Docker.

Each tester has independent, resettable data in their own browser. Reservations, messages, listings, saved offers, payment choices and reports persist across refreshes. Photos use IndexedDB; other state uses localStorage. No application database or account setup is required.

## Deploy through GitHub and Coolify

Push the contents of this folder to your GitHub repository. In Coolify, connect the repository through your GitHub integration and create an application with these settings:

| Setting               | Value                                    |
| --------------------- | ---------------------------------------- |
| Build pack / strategy | **Dockerfile**                           |
| Base Directory        | `/` if the app is at the repository root |
| Dockerfile Location   | `/Dockerfile`                            |
| Ports Exposes         | `8080`                                   |
| Domain                | Your HTTPS app domain                    |
| Auto deploy           | **Deploy on push (webhooks)**            |
| Health check          | HTTP `GET /health`, port `8080`          |

If you keep the folder inside an existing repository, set Base Directory to its actual path: for example `/web-app`, or `/Iter2/web-app` in the original SMU repository. The Dockerfile location stays relative to that directory.

Click Deploy once. Afterward, pushes to the selected branch trigger redeployment. Coolify handles the HTTPS proxy and certificates. No app environment variables, persistent server volume, Compose stack or separate Caddy service is required.

The Dockerfile installs dependencies, prepares the original fonts with their licenses, builds the app and serves it on port 8080. Camera access works through the HTTPS domain. See the official [Dockerfile deployment guide](https://coolify.io/docs/applications/builds/dockerfile) and [automatic deployments guide](https://coolify.io/docs/applications/deployments/automatic-deployments).

## Test locally

With Node.js 24 or newer installed, open a terminal in this folder and run:

```sh
npm run dev
```

That command installs dependencies automatically when they are missing or don't match the lockfile, prepares any missing fonts, and starts Vite. The first run needs internet access to install dependencies. Subsequent runs reuse the installed packages and fonts. If a font download fails, development still starts using a system-font fallback and retries on the next run.

Open `http://localhost:5173`. Localhost supports browser camera access. To test on a phone, use the deployed HTTPS URL; a plain HTTP LAN address does not enable the camera.

Other commands, once dependencies are installed:

```sh
npm test
npm run build
npm run preview
```

For optional browser tests:

```sh
npx playwright install chromium
npm run test:e2e
```

To check the deployed site:

```sh
BASE_URL=https://sharelah.your-domain.com npm run test:e2e
```

## What works

- Home / Map / Create / Splits / Profile navigation, contextual Back labels and a four-step creation indicator.
- Browse, search, category, distance, sorting, saved offers and neighbourhood changes.
- Interactive Leaflet maps with OpenStreetMap tiles, clickable offer pins, zoom controls and a remembered map view. Pickup points and walking distances are sample data; “Near me” resets to the demo Bugis location rather than using GPS. Map tiles require internet access.
- Consistent membership on Home, map pins and cards. Chobani blueberry Greek yoghurt starts in your splits and ready for pickup.
- Offer details → reservation sheet → payment choice → animated five-second cancellation screen → held reservation. Cancelling during the countdown leaves availability and demo payment untouched. Refresh preserves the original deadline; navigating away abandons confirmation. Cancellation after confirmation and before purchase restores availability.
- Ready pickup → live rear-camera QR scanner or uploaded QR image / manual six-digit code → explicit item check → completion and rating. A valid scan does not release payment by itself.
- Problem reports retain the held payment and block pickup completion.
- Persistent local conversations, message drafts and quick replies.
- Shelf-photo capture and upload, item entry, bundle allocation in integer cents, editable pickup details, review, publishing and hosting controls.
- Deal reporting opens the camera, saves a compressed photo locally and lets the tester enter the item and advertised price. Price-tag text is entered manually; OCR is not included.
- Camera switching, optional torch where supported, permission-denied fallbacks, and stream cleanup when the screen closes or becomes hidden.

Payments, neighbour actions, notifications, ratings/history and support resolution are simulated. Messages and reports stay in this browser; they do not reach another person. Each browser has its own listings, so this prototype intentionally has no cross-device marketplace or shared chat.

## Facilitate a usability session

Use **Profile → Testing controls → Demo settings & tools → Start fresh account** to test a new user with no reviews, savings, reservations, completed splits, saved items or conversations. Nearby offers remain browsable. The account mode persists across refreshes and skips sample-history migrations. **Reset my demo** restores the seeded account; both setup actions replace local progress and clear cached photos. Separate browser profiles/devices start independently. Data remains until reset or the browser clears its storage. Private browsing may remove it when the session ends.

On mobile (below 900 px), the prototype lab lives in **Profile → Testing controls**, including both independent A/B/C selectors, radius, neighbourhood, payment and participant simulations. It occupies no space above the app, which fills the dynamic viewport. Desktop keeps the outside-app panel; opening Testing controls places the same controls in that page without duplicating them.

The seeded setup includes two saved offers (TOP detergent and a tumbler) and three short conversations: one ready pickup and two completed splits. Inbox shows only threads with messages tied to an active or completed split, grouped and labelled Current or Completed. Old unrelated offer enquiries are retained in storage but do not appear in Inbox. Chat no longer invents a greeting for every offer.

The tester persona is fixed as Tom Chua. Jerry hosts every seeded split and is the demo neighbour who joins Tom’s listings. Test controls let you simulate Jerry buying a reserved bundle or joining your own listing. Show a facilitator pickup code on another device or print it:

`https://your-domain/testing/pickup-codes.html`

The same cards are available locally in `public/testing/pickup-codes.html`.

| Item                                 | Initial state                                  | Pickup number |
| ------------------------------------ | ---------------------------------------------- | ------------- |
| Chobani blueberry Greek yoghurt      | Ready for pickup                               | 482913        |
| TOP liquid laundry detergent | Available; reserve then simulate host purchase | 635271        |
| Samyang Buldak bowl noodles          | Available; reserve then simulate host purchase | 729418        |

Before the study, test on the actual participant phones over HTTPS: allow/deny permission, capture and retake a shelf photo, upload an image, scan a printed code, enter a wrong number, complete pickup, and navigate away while the camera is running. Check the keyboard and map panning in Safari on iPhone and Chrome on Android. Read `VERIFICATION.md` for the checks completed during implementation and the remaining environment-dependent checks.

## Project layout

`src/` contains the application, domain transitions, browser persistence, router and camera adapter. `public/assets/` contains original Figma artwork; `src/vendor/` contains the bundled QR JavaScript modules; `public/vendor/` contains the WASM binary served locally. `tests/` contains domain, DOM, lifecycle, QR and Playwright checks. `design-reference/` contains the Figma implementation references and is excluded from the Docker image.

Third-party notices are in `THIRD_PARTY_NOTICES.md` and are included in the built app. The earlier `../prototype/` study app is separate from this implementation.

### Supplied deal photos

Home → Spotted deals → View all opens a searchable, category-filtered collection of 49 entries transcribed from the 12 supplied images. Each entry links to its source photo and keeps its advertised price or percentage promotion. Readable multibuys prefill the split form with the correct total, item count and one-item portion; offers with unknown prices or eligibility remain informational. Home search also finds these deals. The bundled collection appears in existing saved demos without a reset and remains after resetting user-created data. See `DEAL_PHOTO_REVIEW.md` for source coverage and reading decisions.

The curated demo has 23 offers across nine categories, including fashion, tech and lifestyle. TOP detergent uses the supplied IMG_2070 photo; fictional non-grocery products use bundled SVG illustrations. Sample prices, stores and pickups are labelled as demo information. Only one yoghurt split remains. Existing reservations retain their IDs and pickup codes when the catalogue refreshes. Sharing a split from a spotted deal carries its image and bundle details into the draft.

### Neighbour profiles and reviews

The prototype uses only Jerry and Tom Chua. Existing saved products migrate to these personas without clearing progress. Tap the host row on an offer, a profile link in a split/chat, or Profile → Neighbour profiles to view a neighbour’s biography, ratings, written reviews and listings. Review-author names link to that author’s profile. After a split is completed, Rate your experience supports 1–5 stars and optional comments (up to 1,000 characters). Reviews persist locally, appear on Jerry’s profile, update the rating average, and can be edited without creating a duplicate. Sample reviews are labelled; there is no cross-device review service.

### Quiet map tiles

The map uses [OpenFreeMap](https://openfreemap.org/quick_start/) **Positron** vector tiles through MapLibre's Leaflet binding, with compact product-photo markers. No API key is needed. OpenFreeMap, OpenMapTiles and OpenStreetMap attribution remains visible. The renderer loads only when a map is opened.

The prototype lab’s confirmation A/B/C selector only configures the next checkout. A shows a receipt with a five-second countdown, cancellation and “Looks good, proceed”. B asks for an explicit confirmation with no countdown. C uses B’s “Are you sure?” screen with A’s circular five-second countdown in the top right; users can confirm immediately or go back before it reserves automatically. Each checkout stores its variant, payment method and deadline in browser history, so refresh or changing the selector cannot alter an active confirmation.

The demo location marker, Near me control and radius circle are centred at SMU Campus Green (1.29572, 103.85096). Seeded pickup locations remain in place.

### Price comparisons

Chobani blueberry yoghurt and TOP detergent details expose Compare prices & travel, including from an existing split. Same-product matches can be expanded to other brands. Integer-cent calculations choose singles, multibuys or a mixture for the requested quantity, show any extra items, add one return-trip estimate or delivery charge, and apply free delivery only when the selected basket reaches the threshold. Pack-size-normalized totals include these costs. Scenario data lives in `src/comparison.ts`; comparison prices, destinations, transit times and fares are fixed demo fixtures, not live quotes. The demo tools explain this, while the comparison offers editable fare and delivery estimates.

### Home/map layout experiment

The separate home/map A/B/C selector persists under `sharelah-home-variant`. A preserves the Home feed and standalone Map tab. B combines them with the map above search, filters and listings. C shows three filtered listings, then the same map, followed by the remaining listings. B/C use one Home tab; the map and list share category/radius filters. A map selection reveals a compact pickup preview without reordering the feed. Layout changes on detail or confirmation screens apply upon returning Home and leave the independent confirmation A/B/C setting intact.

The demo includes four completed October splits (TOP detergent, a tumbler, socks and noodles) in Splits → Past. Their recorded prices, including service fees, account for the initial S$14.20 savings; savings totals now come entirely from completed reservations. These closed listings are excluded from discovery, open into completed receipts, and are added to older saved demos without resetting existing progress or duplicating history.
