import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = dirname(scriptDirectory);
const outputDirectory = join(projectDirectory, "local-test-assets", "S16.4.2", "davinci");
const outputPath = join(outputDirectory, "A_PRE_BT709_G24_FULL.png");
const metadataPath = join(outputDirectory, "A_PRE_BT709_G24_FULL.json");
const width = 3840;
const height = 2160;
const channels = 3;
const pixels = Buffer.alloc(width * height * channels);

const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)));

const setPixel = (x, y, color) => {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return;
  }
  const offset = (y * width + x) * channels;
  pixels[offset] = clampByte(color[0]);
  pixels[offset + 1] = clampByte(color[1]);
  pixels[offset + 2] = clampByte(color[2]);
};

const fillRect = (x, y, rectWidth, rectHeight, color) => {
  const startX = Math.max(0, Math.floor(x));
  const endX = Math.min(width, Math.ceil(x + rectWidth));
  const startY = Math.max(0, Math.floor(y));
  const endY = Math.min(height, Math.ceil(y + rectHeight));
  for (let row = startY; row < endY; row += 1) {
    for (let column = startX; column < endX; column += 1) {
      setPixel(column, row, color);
    }
  }
};

const drawHorizontalRamp = (x, y, rampWidth, rampHeight, start, end) => {
  const denominator = Math.max(1, rampWidth - 1);
  for (let column = 0; column < rampWidth; column += 1) {
    const ratio = column / denominator;
    const color = [
      start[0] + (end[0] - start[0]) * ratio,
      start[1] + (end[1] - start[1]) * ratio,
      start[2] + (end[2] - start[2]) * ratio
    ];
    fillRect(x + column, y, 1, rampHeight, color);
  }
};

const drawPatchRow = (x, y, rowWidth, rowHeight, colors) => {
  const patchWidth = rowWidth / colors.length;
  colors.forEach((color, index) => {
    fillRect(x + patchWidth * index, y, patchWidth + 1, rowHeight, color);
  });
};

const mix = (left, right, ratio) => [
  left[0] + (right[0] - left[0]) * ratio,
  left[1] + (right[1] - left[1]) * ratio,
  left[2] + (right[2] - left[2]) * ratio
];

const crcTable = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const createChunk = (type, data) => {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
};

const encodePng = () => {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const gamma = Buffer.alloc(4);
  gamma.writeUInt32BE(41_667, 0);
  const chromaticities = Buffer.alloc(32);
  [31_270, 32_900, 64_000, 33_000, 30_000, 60_000, 15_000, 6_000].forEach((value, index) => {
    chromaticities.writeUInt32BE(value, index * 4);
  });
  const contractText = Buffer.from("ColorContract\0BT.709 Gamma 2.4 Full Range", "latin1");
  const raw = Buffer.alloc((width * channels + 1) * height);
  for (let row = 0; row < height; row += 1) {
    const rowOffset = row * (width * channels + 1);
    raw[rowOffset] = 0;
    pixels.copy(raw, rowOffset + 1, row * width * channels, (row + 1) * width * channels);
  }

  return Buffer.concat([
    signature,
    createChunk("IHDR", ihdr),
    createChunk("gAMA", gamma),
    createChunk("cHRM", chromaticities),
    createChunk("tEXt", contractText),
    createChunk("IDAT", deflateSync(raw, { level: 9 })),
    createChunk("IEND", Buffer.alloc(0))
  ]);
};

const main = () => {
  fillRect(0, 0, width, height, [8, 11, 16]);
  fillRect(80, 70, width - 160, 36, [36, 45, 58]);
  drawHorizontalRamp(96, 150, 3648, 210, [0, 0, 0], [255, 255, 255]);

  drawHorizontalRamp(96, 430, 1152, 210, [0, 0, 0], [255, 0, 0]);
  drawHorizontalRamp(1344, 430, 1152, 210, [0, 0, 0], [0, 255, 0]);
  drawHorizontalRamp(2592, 430, 1152, 210, [0, 0, 0], [0, 0, 255]);

  drawPatchRow(96, 720, 1752, 250, [
    [255, 0, 0], [0, 255, 0], [0, 0, 255], [0, 255, 255], [255, 0, 255], [255, 255, 0]
  ]);
  drawPatchRow(1992, 720, 1752, 250, [
    [32, 32, 32], [72, 72, 72], [128, 128, 128], [192, 192, 192],
    [240, 195, 165], [201, 135, 106], [143, 90, 68], [248, 248, 248]
  ]);

  const neutral = [128, 128, 128];
  const saturationSteps = [];
  for (let index = 0; index < 6; index += 1) {
    saturationSteps.push(mix(neutral, [255, 0, 0], index / 5));
  }
  for (let index = 0; index < 6; index += 1) {
    saturationSteps.push(mix(neutral, [0, 96, 255], index / 5));
  }
  drawPatchRow(96, 1060, 3648, 240, saturationSteps);

  drawHorizontalRamp(96, 1390, 1152, 240, [0, 0, 0], [112, 24, 24]);
  drawHorizontalRamp(1344, 1390, 1152, 240, [0, 0, 0], [24, 88, 112]);
  drawHorizontalRamp(2592, 1390, 1152, 240, [12, 12, 12], [255, 244, 220]);

  drawHorizontalRamp(96, 1720, 1752, 250, [0, 0, 0], [96, 96, 96]);
  drawHorizontalRamp(1992, 1720, 1752, 250, [128, 128, 128], [255, 255, 255]);
  fillRect(96, 2040, 3648, 40, [36, 45, 58]);

  const png = encodePng();
  const sha256 = createHash("sha256").update(png).digest("hex");
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(outputPath, png);
  writeFileSync(metadataPath, `${JSON.stringify({
    task: "S16.4.2-CU-FOCUS-RECOVERY",
    generatedAt: new Date().toISOString(),
    fileName: "A_PRE_BT709_G24_FULL.png",
    width,
    height,
    bitDepth: 8,
    colorType: "RGB",
    inputContract: "BT.709 / Gamma 2.4 / Full",
    pngGammaChunk: 0.41667,
    chromaticities: "Rec.709",
    sha256
  }, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ outputPath, metadataPath, width, height, sha256 }, null, 2)}\n`);
};

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : "未知校准图生成错误";
  console.error(`校准图生成失败：${message}`);
  process.exitCode = 1;
}
