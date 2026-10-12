# ShareLah prototype third-party notices

Original ShareLah logo, icons, map and product illustrations were exported from the user's Figma file `ak4IecsfKTbnzfkWYzbOnK`. They remain part of that project; no third-party stock artwork was added.

Runtime dependency license texts are distributed in `/licenses/`:

- React and React DOM — MIT, Meta Platforms, Inc. and affiliates. Source: https://github.com/facebook/react
- Lucide React — ISC, Lucide Contributors; portions by Cole Bemis (Feather, MIT). Source: https://github.com/lucide-icons/lucide
- idb — ISC, Jake Archibald. Source: https://github.com/jakearchibald/idb
- QRCode for JavaScript — MIT, Copyright (c) 2009 Kazuhiko Arase. Source: http://www.d-project.com/; the Node port from qrcode-terminal is converted to ES modules here. Modified: require/module.exports converted to import/export; algorithm unchanged. Original source notices and the port's LICENSE are retained in `src/vendor/qr-code/` in the source distribution; the runtime license is also included under `/licenses/`.
- ZXing-WASM — MIT, Copyright (c) 2023 Ze-Zheng Wu. Source: https://github.com/Sec-ant/zxing-wasm (v3.1.2). The reader-only Emscripten factory and matching reader WASM were recovered from an installed distribution because outbound shell downloads were unavailable. Modified: exported factory as a standalone ES module; application adapter added separately in `src/qr.ts`. No browser service code is included.
- ZXing-C++ and ZXingWasm.cpp — Apache License 2.0. Sources: https://github.com/zxing-cpp/zxing-cpp and https://github.com/Sec-ant/zxing-wasm/tree/v3.1.2/src/cpp. Full Apache license included in `/licenses/Apache-2.0.txt`. The reader build is used; zint barcode-writing support is not used.
- Emscripten runtime — MIT (chosen from its MIT / University of Illinois-NCSA dual licensing), Copyright (c) 2010-2014 Emscripten authors. Source: https://github.com/emscripten-core/emscripten
- musl runtime portions — MIT, Copyright © 2005-2020 Rich Felker, et al. Source and contributor notices: https://github.com/emscripten-core/emscripten/blob/main/system/lib/libc/musl/COPYRIGHT

Fonts are downloaded at image build time from the official Google Fonts repository, then served locally. The download script includes each font's full SIL Open Font License next to the font under `/fonts/`:

- Inter — The Inter Project Authors, Rasmus Andersson. https://github.com/google/fonts/tree/main/ofl/inter
- Bricolage Grotesque — The Bricolage Grotesque Project Authors, Mathieu Triay. https://github.com/google/fonts/tree/main/ofl/bricolagegrotesque

Build/test dependencies remain governed by the licenses in their npm packages. No authentication credentials, analytics, external QR service, or camera upload service is included.
