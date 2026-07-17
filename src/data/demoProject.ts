export interface DemoTargetImage {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly format: "SVG";
  readonly inputState: "rec709";
  readonly gamma: "Rec.709";
  readonly gamut: "Rec.709";
}

const demoTargetSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#111827"/>
      <stop offset="0.45" stop-color="#7c245f"/>
      <stop offset="1" stop-color="#0f766e"/>
    </linearGradient>
    <linearGradient id="light" x1="0" x2="1">
      <stop offset="0" stop-color="#f97316" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#22d3ee" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <rect x="170" y="180" width="1260" height="540" rx="36" fill="#05070a" opacity="0.48"/>
  <rect x="250" y="250" width="360" height="410" rx="18" fill="#f8fafc" opacity="0.82"/>
  <rect x="660" y="250" width="690" height="410" rx="18" fill="#020617" opacity="0.58"/>
  <rect x="720" y="310" width="520" height="40" fill="url(#light)" opacity="0.84"/>
  <rect x="720" y="400" width="420" height="32" fill="#f472b6" opacity="0.68"/>
  <rect x="720" y="486" width="560" height="32" fill="#22d3ee" opacity="0.58"/>
  <circle cx="1280" cy="308" r="54" fill="#f97316" opacity="0.74"/>
</svg>
`;

export const demoTargetImage: DemoTargetImage = {
  id: "demo-target-rec709",
  name: "demo-target-rec709.svg",
  url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(demoTargetSvg)}`,
  width: 1600,
  height: 900,
  format: "SVG",
  inputState: "rec709",
  gamma: "Rec.709",
  gamut: "Rec.709"
};
