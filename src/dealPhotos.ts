// Crops are measured against the bundled JPEGs, in pixels. The browser clips
// the original photo, so product labels and prices are never redrawn.
export type Crop = readonly [
  x: number,
  y: number,
  width: number,
  height: number,
];
type DealPhoto = {
  source: string;
  width: number;
  height: number;
  thumbnail: Crop;
  detail: Crop;
};
function frame(file: string, thumbnail: Crop, detail = thumbnail): DealPhoto {
  return {
    source: `/assets/deals/${file}.jpg`,
    width: file === "IMG_2069" ? 662 : file === "IMG_2070" ? 1440 : 1080,
    height: 1440,
    thumbnail,
    detail,
  };
}
export const dealPhotos: Record<string, DealPhoto> = {
  "chobani-blueberry": frame(
    "IMG_2069",
    [247, 432, 170, 143],
    [237, 404, 190, 310],
  ),
  "chobani-strawberry": frame(
    "IMG_2069",
    [37, 785, 175, 143],
    [27, 752, 190, 310],
  ),
  "dairy-lemon": frame("IMG_2069", [246, 766, 172, 166], [237, 752, 190, 310]),
  brownes: frame("IMG_2069", [33, 409, 177, 177], [27, 404, 190, 310]),
  "dairy-strawberry": frame(
    "IMG_2069",
    [462, 769, 162, 160],
    [446, 752, 190, 310],
  ),
  "chobani-plain": frame(
    "IMG_2069",
    [472, 416, 143, 168],
    [446, 404, 190, 310],
  ),
  delivery: frame("IMG_2069", [135, 260, 390, 45]),
  carefree: frame("IMG_1856", [741, 692, 238, 209], [608, 449, 380, 455]),
  laurier: frame("IMG_1856", [97, 1149, 363, 147], [178, 425, 329, 349]),
  ocbc: frame("IMG_1856", [168, 155, 320, 269]),
  shopback: frame("IMG_1856", [631, 196, 270, 255]),
  diffuser: frame("IMG_1858", [185, 515, 487, 623], [180, 164, 535, 984]),
  "avene-fluid": frame("IMG_1858", [847, 1002, 93, 188], [844, 997, 111, 309]),
  "avene-tinted": frame(
    "IMG_1858",
    [936, 1014, 144, 198],
    [942, 1011, 138, 329],
  ),
  dbs: frame("IMG_1858", [350, 0, 386, 165]),
  student: frame("IMG_1886", [296, 560, 545, 663], [198, 452, 727, 811]),
  "sukiyaki-rosu": frame("IMG_1886", [240, 108, 237, 151], [231, 97, 258, 266]),
  "sukiyaki-wagyu": frame(
    "IMG_1886",
    [628, 102, 225, 150],
    [565, 93, 307, 278],
  ),
  honshibori: frame("IMG_2007", [10, 0, 219, 112], [8, 0, 221, 220]),
  "garage-hardcore": frame("IMG_2007", [234, 0, 230, 114], [232, 0, 327, 224]),
  jprem: frame("IMG_2007", [242, 286, 400, 267], [240, 283, 403, 331]),
  absolut: frame("IMG_2007", [110, 690, 225, 221], [109, 688, 226, 280]),
  "garage-lemon": frame("IMG_2007", [340, 643, 216, 269], [340, 640, 216, 328]),
  "garage-cocktails": frame(
    "IMG_2007",
    [552, 643, 179, 266],
    [551, 637, 314, 325],
  ),
  kronenbourg: frame("IMG_2007", [457, 1030, 274, 197], [455, 1028, 276, 267]),
  "beer-unreadable": frame("IMG_2007", [56, 1205, 105, 85]),
  buldak: frame("IMG_2008", [277, 732, 279, 237], [5, 737, 824, 518]),
  nissin: frame("IMG_2008", [237, 121, 391, 294], [233, 116, 450, 612]),
  // Tex-Mex is named on the sign, but its pack is not identifiable in frame.
  "ribeye-texmex": frame("IMG_2010", [218, 849, 249, 304]),
  "ribeye-bbq": frame("IMG_2010", [640, 370, 300, 238], [631, 362, 336, 286]),
  "ribeye-peppery": frame(
    "IMG_2010",
    [303, 397, 387, 240],
    [284, 388, 410, 316],
  ),
  chicken: frame("IMG_1744", [378, 522, 340, 365], [192, 516, 532, 627]),
  "pork-ribs": frame("IMG_2009", [451, 126, 333, 242], [306, 995, 451, 239]),
  "kirin-six": frame("IMG_2060", [140, 144, 818, 743], [97, 140, 890, 1139]),
  "mos-block": frame("IMG_2019", [341, 638, 138, 194]),
  moisturiser: frame("IMG_2019", [457, 581, 80, 180]),
  gaia: frame("IMG_2019", [577, 493, 100, 143]),
  chewable: frame("IMG_2019", [590, 630, 72, 143]),
  fittwo: frame("IMG_2019", [502, 666, 96, 137]),
  primrose: frame("IMG_2019", [256, 970, 141, 202]),
  swisse: frame("IMG_2019", [455, 970, 81, 121]),
  bioglan: frame("IMG_2019", [657, 823, 105, 131]),
  strepsils: frame("IMG_2019", [725, 853, 58, 103]),
  difflam: frame("IMG_2019", [775, 823, 54, 98]),
  bioderma: frame("IMG_2019", [321, 1211, 77, 93]),
  turnup: frame("IMG_2019", [465, 1143, 71, 106]),
  hydrance: frame("IMG_2019", [533, 1101, 58, 111]),
  clearance: frame("IMG_2019", [150, 156, 553, 407]),
  "top-reference": frame("IMG_2070", [367, 93, 714, 1245]),
};

// The fragment carries the crop through saved drafts/listings as one photo ID.
// It is stripped before loading the image or opening the full source photo.
export function dealPhoto(id: string) {
  const photo = dealPhotos[id];
  if (!photo) throw new Error(`Missing deal crop: ${id}`);
  return `${photo.source}#deal=${id}`;
}
export function resolveDealPhoto(id: string) {
  const [source, fragment] = id.split("#deal=");
  const photo = dealPhotos[fragment];
  return photo?.source === source ? photo : undefined;
}
export const photoSource = (id: string) => id.split("#deal=")[0];
