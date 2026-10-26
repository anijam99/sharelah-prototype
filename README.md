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
- Browse, search, category, distance, sorting, saved splits and neighbourhood changes. Home explains its two feeds: **splits** (a neighbour buys a bundle; you reserve a portion) and **spotted deals** (price tips you buy yourself, or start a split from). Each spotted deal shows when it was spotted; catalogue dates are made up and fall within the week before 19 Oct 2026.
- Interactive Leaflet maps with OpenStreetMap tiles, clickable offer pins, zoom controls and a remembered map view. Pickup points and walking distances are sample data. The area row shows the search radius in brackets (e.g. “Bugis (500 m)”); the filter button sits beside Change area on Home and Map (and beside the search box on the search page). The Map tab opens on your first joined split (same order as Splits → Joined; Chobani in the seeded demo). A tapped pin is restored only when you return from its details or directions. The map keeps joined splits on the map even outside the radius, frames both you and that pickup, and draws a dashed walking line to it, with Directions as the main button. The map stretches to the screen height so the selected split's buttons are visible without scrolling. Map tiles require internet access.
- Consistent membership on Home, map pins and cards. Chobani blueberry Greek yoghurt starts in your splits and ready for pickup.
- Split details show price, savings, host, pickup time and place at a glance, with Save, Compare, Ask the host, Directions and Shelf photo actions. Split details → reservation sheet (choose one or more portions; one service fee per reservation) → payment choice → animated five-second cancellation screen → held reservation. Cancelling during the countdown leaves availability and demo payment untouched. Refresh preserves the original deadline; navigating away abandons confirmation. Cancellation after confirmation and before purchase restores availability. Every split shows the host’s buy-by time (an hour before pickup unless set); if the host misses it, the hold is released automatically and the split shows “Your hold was released”.
- Ready pickup → live rear-camera QR scanner or uploaded QR image / manual six-digit code → explicit item check → completion and rating. A valid scan does not release payment by itself.
- Hosts approve who joins. Reserving someone else’s split sends a request and holds your payment; Jerry accepts after about three seconds (Testing controls can make him accept now, decline, or remove you, and each releases the hold with an explanation). When you host, a request shows the neighbour’s rating, review count, completed splits and latest review (with a warning if their rating is low). You can accept, decline, or remove someone you accepted until you buy the bundle. After you publish a split, Jerry asks to join after about 8 seconds; Testing controls can also send his request at any time. A pending request shows a red “!” on the Splits tab, the Hosting segment and the Home Inbox shortcut, a “Jerry asked to join” strip on the split’s card in Splits → Hosting, and a Join requests section at the top of Messages. After **Mark purchased & notify**, the pickup code panel has **Simulate Jerry scanning the code** (also in Testing controls → Hosting simulation); once everyone you accepted has collected, the split shows “Split complete” and moves to Splits → Past.
- Problem reports retain the held payment and block pickup completion.
- Any split or spotted deal can be reported as fake, expired, out of stock, wrong or prohibited. Reports can be edited or withdrawn and stay in this browser.
- Persistent local conversations, message drafts and quick replies. You can ask a host a question before reserving; Jerry sends one demo reply, and these threads appear under “Questions to hosts” in Messages.
- Shelf-photo capture and upload, item entry, bundle allocation in integer cents, editable pickup details, review, publishing and hosting controls.
- Posting a spotted deal opens the camera, saves a compressed photo locally and lets the tester enter the item and advertised price. Price-tag text is entered manually; OCR is not included.
- Camera switching, optional torch where supported, permission-denied fallbacks, and stream cleanup when the screen closes or becomes hidden.

Payments, neighbour actions, notifications, ratings/history and support resolution are simulated. Messages and reports stay in this browser; they do not reach another person. Each browser has its own listings, so this prototype intentionally has no cross-device marketplace or shared chat.

## Facilitate a usability session

Use **Profile → Testing controls → Demo settings & tools → Start fresh account** to test a new user with no reviews, savings, reservations, completed splits, saved items or conversations. Nearby offers remain browsable. The account mode persists across refreshes and skips sample-history migrations. **Reset my demo** restores the seeded account; both setup actions replace local progress and clear cached photos. Separate browser profiles/devices start independently. Data remains until reset or the browser clears its storage. Private browsing may remove it when the session ends.

On mobile (below 900 px), the prototype lab lives in **Profile → Testing controls**, including both independent A/B/C selectors, radius, neighbourhood, payment and participant simulations. It occupies no space above the app, which fills the dynamic viewport. Desktop keeps the outside-app panel; opening Testing controls places the same controls in that page without duplicating them.

The seeded setup includes two saved splits (TOP detergent and a tumbler) and three short conversations: one ready pickup and two completed splits. Inbox groups threads as Current splits, Questions to hosts (messages sent before reserving) and Completed splits.

The tester persona is fixed as Tom Chua. Jerry hosts every seeded split and asks to join Tom’s splits. Test controls let you simulate Jerry buying a reserved bundle, missing the buy-by time, or joining your own split. Show a facilitator pickup code on another device or print it:

`https://your-domain/testing/pickup-codes.html`

The same cards are available locally in `public/testing/pickup-codes.html`.

| Item                            | Initial state                                  | Pickup number |
| ------------------------------- | ---------------------------------------------- | ------------- |
| Chobani blueberry Greek yoghurt | Ready for pickup                               | 482913        |
| TOP liquid laundry detergent    | Available; reserve then simulate host purchase | 635271        |
| Samyang Buldak bowl noodles     | Available; reserve then simulate host purchase | 729418        |

Before the study, test on the actual participant phones over HTTPS: allow/deny permission, capture and retake a shelf photo, upload an image, scan a printed code, enter a wrong number, complete pickup, and navigate away while the camera is running. Check the keyboard and map panning in Safari on iPhone and Chrome on Android. Read `VERIFICATION.md` for the checks completed during implementation and the remaining environment-dependent checks.

## Project layout

`src/` contains the application, domain transitions (`model.ts`), browser persistence (`store.tsx`), router and camera adapter. `App.tsx` only routes; screens live in their own files, and every sheet is opened through the typed `Modal` union in `Modals.tsx`. Styles are split by area under `src/styles/`, imported in cascade order by `src/styles/index.css`; put new rules in the file for the screen they style. `public/assets/` contains original Figma artwork; `src/vendor/` contains the bundled QR JavaScript modules; `public/vendor/` contains the WASM binary served locally. `tests/` contains domain, DOM, lifecycle, QR and Playwright checks. `design-reference/` contains the Figma implementation references and is excluded from the Docker image.

Third-party notices are in `THIRD_PARTY_NOTICES.md` and are included in the built app. The earlier `../prototype/` study app is separate from this implementation.

### Supplied deal photos

Home → Spotted deals → View all opens a searchable, category-filtered, sortable (newest, biggest saving, lowest price) collection of 49 entries transcribed from the 12 supplied images. Search and categories stay pinned while scrolling, and each card shows the offer, price, per-item price and saving. **Post a deal** always starts empty; its Demo autofill fills in the sample. Each entry links to its source photo and keeps its advertised price or percentage promotion. Readable multibuys prefill the split form with the correct total, item count and one-item portion; offers with unknown prices or eligibility remain informational. Home search also finds these deals. The bundled collection appears in existing saved demos without a reset and remains after resetting user-created data. See `DEAL_PHOTO_REVIEW.md` for source coverage and reading decisions.

The curated demo has 23 offers across nine categories, including fashion, tech and lifestyle. TOP detergent uses the supplied IMG_2070 photo; fictional non-grocery products use bundled SVG illustrations. Prices, stores and pickups are sample data, but the app presents them without demo labels so study participants see a finished-looking product; Testing controls remain available from Profile. Only one yoghurt split remains. Existing reservations retain their IDs and pickup codes when the catalogue refreshes. Sharing a split from a spotted deal carries its image and bundle details into the draft.

### Neighbour profiles and reviews

The prototype uses only Jerry and Tom Chua. Existing saved products migrate to these personas without clearing progress. Tap the host row on an offer, a profile link in a split/chat, or Profile → Neighbour profiles to view a neighbour’s biography, ratings, written reviews and listings. Review-author names link to that author’s profile. After a split is completed, Rate your experience supports 1–5 stars and optional comments (up to 1,000 characters). Reviews persist locally, appear on Jerry’s profile, update the rating average, and can be edited without creating a duplicate. Sample reviews look like ordinary reviews; there is no cross-device review service.

### Quiet map tiles

The map uses [OpenFreeMap](https://openfreemap.org/quick_start/) **Positron** vector tiles through MapLibre's Leaflet binding, with compact product-photo markers. No API key is needed. OpenFreeMap, OpenMapTiles and OpenStreetMap attribution remains visible. The renderer loads only when a map is opened.

The prototype lab’s confirmation A/B/C selector only configures the next checkout. A shows a receipt with a five-second countdown, cancellation and “Looks good, proceed”. B asks for an explicit confirmation with no countdown. C uses B’s “Are you sure?” screen with A’s circular five-second countdown in the top right; users can confirm immediately or go back before it reserves automatically. Each checkout stores its variant, payment method and deadline in browser history, so refresh or changing the selector cannot alter an active confirmation.

The demo location marker and radius circle are centred at SMU Campus Green (1.29572, 103.85096). Seeded pickup locations remain in place.

### Price comparisons

Chobani blueberry yoghurt and TOP detergent details expose Compare prices & travel, including from an existing split. Same-product matches can be expanded to other brands. Integer-cent calculations choose singles, multibuys or a mixture for the requested quantity, show any extra items, add one return-trip estimate or delivery charge, and apply free delivery only when the selected basket reaches the threshold. Pack-size-normalized totals include these costs. Scenario data lives in `src/comparison.ts`; comparison prices, destinations, transit times and fares are fixed demo fixtures, not live quotes. The demo tools explain this, while the comparison offers editable fare and delivery estimates.

### Start a split experiment

The prototype lab’s **Start a split A/B** selector persists under `sharelah-create-variant`. **A · Step by step** keeps the four-screen flow (item, portions, pickup, review). **B · One page** shows the same fields in three numbered sections on one scrolling page with a single **Publish split** button; publishing with missing details marks every incomplete section and scrolls to the first. Both layouts use the same numbered section cards (Item, Portions & price, Pickup), fields and validation rules, so only the layout differs; A adds a read-only review screen built from the same cards. Each A screen fits a phone without scrolling (checked at 390×844, 375×667 and 390×664, including the /a study bar), so scrolling is unique to B. A dashed **Demo autofill** button fills in the TOP detergent sample for demos and study tasks. The price-tag camera (and the pickup QR scanner) fill the screen without scrolling. In the price-tag camera, a small, translucent simulated AR tag “finds” a price tag after about 1.5 seconds and shows its per-item price beside it (2 for S$21.00 → S$10.50 each); nothing is read from the camera feed.

**A/B study (`/a`, `/b`).** The session follows a script: a welcome explaining ShareLah and that we’re testing the app, not them; an “about you” screen with age group and occupation (both allow “Prefer not to say”); a background note before task 1; and a 1–10 confidence question about sharing a bulk buy with a neighbour through an app after both tasks, before the thank-you. The “In real life” pop-ups are styled like iOS system alerts. Each then does the same task in both layouts (order counterbalanced), rating ease (1–5) with a comment after each. Task time, pages and blocked Next/Publish taps are measured only from choosing _Start a split_ until the split is published, the part where the layouts differ. After publishing, Jerry’s request appears on screen to accept; the next steps (buying the bundle, Jerry scanning your code) are each explained by an “In real life” pop-up that appears 5 seconds after the screen changes; Jerry only scans after that pop-up, and the _Simulate scanning_ button is hidden during the study. A final step asks which version they would use (first, second or no preference), what made it better (themes, shown with their category in brackets: easier to understand (intuitive), quicker to finish (efficient), clearer layout (layout), less scrolling or tapping (convenient), easier to check and fix details (recoverable), felt more familiar (familiar), looked more modern (modern), something else) and why, in their own words; the open question quotes the themes they picked. Without asking anything extra, each row also records pages visited and blocked Next/Publish taps per task, start and finish time, total duration, and device category, OS and browser from the user agent. Columns are listed in `docs/google-apps-script.gs`.

The confirmation and home/map tests are not used in the current study, so the lab folds them under **Inactive tests**. They still work when expanded, and the lab remembers whether that section is open. Switching mid-flow keeps what you’ve entered. This test doesn’t interact with the confirmation or home/map tests, so all three selectors stay available together.

### Home/map layout experiment

The separate home/map A/B/C selector persists under `sharelah-home-variant`. A preserves the Home feed and standalone Map tab. B combines them with the map above search, filters and listings. C shows three filtered listings, then the same map, followed by the remaining listings. B/C use one Home tab; the map and list share category/radius filters. A map selection reveals a compact pickup preview without reordering the feed. Layout changes on detail or confirmation screens apply upon returning Home and leave the independent confirmation A/B/C setting intact.

The demo includes four completed October splits (TOP detergent, a tumbler, socks and noodles) in Splits → Past. Their recorded prices, including service fees, account for the initial S$14.20 savings; savings totals now come entirely from completed reservations. These closed listings, and any split you finish collecting, are excluded from discovery (Home, Map, search, Saved and Jerry’s listings), open into completed receipts, and are added to older saved demos without resetting existing progress or duplicating history.
