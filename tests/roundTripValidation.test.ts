import assert from "node:assert/strict";
import test from "node:test";
import { parseCubeLut } from "../src/utils/cubeParser";
import { LatestRequestGate } from "../src/utils/latestRequestGate";
import { compareRoundTripPixels } from "../src/utils/roundTripComparison";
import {
  applyCubeToRoundTripFrame,
  assessRoundTripSameFrame,
  createMissingRoundTripAssetsDiagnostic,
  releaseRoundTripObjectUrl,
  validateRoundTripFrames
} from "../src/utils/roundTripValidation";

const createCubeText = (size: 17 | 33 | 65, transform: (value: number) => number): string => {
  const lines = [
    'TITLE "ROUNDTRIP_TEST"',
    `LUT_3D_SIZE ${size}`,
    "DOMAIN_MIN 0.0 0.0 0.0",
    "DOMAIN_MAX 1.0 1.0 1.0"
  ];
  const maximum = size - 1;

  for (let blue = 0; blue < size; blue += 1) {
    for (let green = 0; green < size; green += 1) {
      for (let red = 0; red < size; red += 1) {
        lines.push(`${transform(red / maximum).toFixed(6)} ${transform(green / maximum).toFixed(6)} ${transform(blue / maximum).toFixed(6)}`);
      }
    }
  }

  return `${lines.join("\n")}\n`;
};

const createPatternFrame = (width = 24, height = 18): { readonly width: number; readonly height: number; readonly data: Uint8ClampedArray } => {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const diagonal = (x * 17 + y * 29 + (x > width / 2 ? 71 : 0)) % 256;
      data[offset] = diagonal;
      data[offset + 1] = (diagonal * 3 + y * 11) % 256;
      data[offset + 2] = (255 - diagonal + x * 7) % 256;
      data[offset + 3] = 255;
    }
  }

  return { width, height, data };
};

const createDifferentSceneFrame = (width = 24, height = 18): { readonly width: number; readonly height: number; readonly data: Uint8ClampedArray } => {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const insideShape = x > 3 && x < 11 && y > 4 && y < 15;
      data[offset] = insideShape ? 236 : 18;
      data[offset + 1] = insideShape ? 74 : 32;
      data[offset + 2] = insideShape ? 35 : 88;
      data[offset + 3] = 255;
    }
  }

  return { width, height, data };
};

const identityCube = parseCubeLut(createCubeText(17, (value) => value)).lut;
const toneCube = parseCubeLut(createCubeText(17, (value) => Math.min(1, value * 0.72 + 0.12))).lut;

test("validates a normal PRE -> cube -> POST direction", () => {
  const pre = createPatternFrame();
  const post = applyCubeToRoundTripFrame(pre, toneCube);
  const result = validateRoundTripFrames({ pre, post, cube: toneCube, cubeMatchesCurrentWorkspace: "matched" });

  assert.equal(result.sameFrame.status, "same-frame");
  assert.equal(result.diagnostic.verdict, "validated");
  assert.equal(result.diagnostic.isWebsiteAlgorithmBug, "no-evidence");
});

test("detects a reversed PRE / POST pair", () => {
  const pre = createPatternFrame();
  const post = applyCubeToRoundTripFrame(pre, toneCube);
  const result = validateRoundTripFrames({ pre: post, post: pre, cube: toneCube, cubeMatchesCurrentWorkspace: "matched" });

  assert.equal(result.diagnostic.verdict, "pre-post-reversed");
});

test("invalidates frames with different edge structure", () => {
  const pre = createPatternFrame();
  const post = createDifferentSceneFrame();
  const result = validateRoundTripFrames({ pre, post, cube: toneCube, cubeMatchesCurrentWorkspace: "matched" });

  assert.equal(result.sameFrame.status, "different-frame");
  assert.equal(result.diagnostic.verdict, "different-frame");
});

test("flags a probable double LUT output", () => {
  const pre = createPatternFrame();
  const once = applyCubeToRoundTripFrame(pre, toneCube);
  const twice = applyCubeToRoundTripFrame(once, toneCube);
  const result = validateRoundTripFrames({ pre, post: twice, cube: toneCube, cubeMatchesCurrentWorkspace: "matched" });

  assert.equal(result.diagnostic.verdict, "double-lut-suspected");
});

test("flags a stale or wrong cube without claiming a website algorithm failure", () => {
  const pre = createPatternFrame();
  const post = applyCubeToRoundTripFrame(pre, toneCube);
  const result = validateRoundTripFrames({ pre, post, cube: identityCube, cubeMatchesCurrentWorkspace: "mismatched" });

  assert.equal(result.diagnostic.verdict, "wrong-or-stale-cube");
  assert.equal(result.diagnostic.isWebsiteAlgorithmBug, "no-evidence");
});

test("accepts an identity cube and each supported cube point count", () => {
  const pre = createPatternFrame();

  for (const size of [17, 33, 65] as const) {
    const cube = parseCubeLut(createCubeText(size, (value) => value)).lut;
    const post = applyCubeToRoundTripFrame(pre, cube);
    const result = validateRoundTripFrames({ pre, post, cube, cubeMatchesCurrentWorkspace: "matched" });
    assert.equal(result.diagnostic.verdict, "validated");
  }
});

test("rejects dimension mismatch before directional metrics", () => {
  const pre = createPatternFrame(24, 18);
  const post = createPatternFrame(23, 18);
  const assessment = assessRoundTripSameFrame(pre, post);

  assert.equal(assessment.status, "different-frame");
  assert.equal(assessment.dimensionsMatch, false);
});

test("preserves gamma and range mismatches as settings diagnostics", () => {
  const pre = createPatternFrame();
  const post = applyCubeToRoundTripFrame(pre, toneCube);
  const altered = new Uint8ClampedArray(post.data);
  for (let index = 0; index < altered.length; index += 4) {
    altered[index] = Math.round((altered[index] / 255) ** 0.72 * 255);
    altered[index + 1] = Math.round((altered[index + 1] / 255) ** 0.72 * 255);
    altered[index + 2] = Math.round((altered[index + 2] / 255) ** 0.72 * 255);
  }
  const result = validateRoundTripFrames({
    pre,
    post: { width: post.width, height: post.height, data: altered },
    cube: toneCube,
    cubeMatchesCurrentWorkspace: "matched"
  });

  assert.equal(result.diagnostic.verdict, "profile-or-davinci-settings");
});

test("keeps stale parallel validation results out of the current request", () => {
  const gate = new LatestRequestGate();
  const first = gate.begin();
  const second = gate.begin();

  assert.equal(gate.isCurrent(first), false);
  assert.equal(gate.isCurrent(second), true);
});

test("releases only object URLs that the caller owns", () => {
  const released: string[] = [];
  releaseRoundTripObjectUrl("blob:roundtrip-test", (url) => released.push(url));
  releaseRoundTripObjectUrl("https://example.test/image.png", (url) => released.push(url));

  assert.deepEqual(released, ["blob:roundtrip-test"]);
});

test("reports missing real assets honestly", () => {
  const diagnostic = createMissingRoundTripAssetsDiagnostic([
    "Timeline 116.444_00219502.dpx",
    "Timeline 116.444_00219339.dpx",
    "POST_BT709_G24_FULL_SRC-Sony-SLog3_CustomL16.444_33pt_v1(1).cube"
  ]);

  assert.equal(diagnostic.verdict, "inconclusive");
  assert.equal(diagnostic.isWebsiteAlgorithmBug, "undetermined");
  assert.ok(diagnostic.nextActions.length <= 3);
});

test("reports high-error channel distribution without hiding an isolated outlier", () => {
  const width = 100;
  const height = 100;
  const expected = new Uint8ClampedArray(width * height * 4);
  const actual = new Uint8ClampedArray(width * height * 4);

  for (let index = 0; index < expected.length; index += 4) {
    expected[index] = 128;
    expected[index + 1] = 128;
    expected[index + 2] = 128;
    expected[index + 3] = 255;
    actual[index] = 128;
    actual[index + 1] = 128;
    actual[index + 2] = 128;
    actual[index + 3] = 255;
  }
  actual[0] = 154;

  const result = compareRoundTripPixels({ expected, actual, width, height });

  assert.equal(result.channelSampleCount, 30000);
  assert.equal(result.channelErrorAbove025Count, 1);
  assert.equal(result.channelErrorAbove04Count, 1);
  assert.equal(result.channelErrorAbove08Count, 1);
  assert.equal(result.p99Error, 0);
  assert.equal(result.p999Error, 0);
  assert.ok(result.maximumError > 0.1);
  assert.equal(result.passed, true);
});

test("rejects a repeated high-error tail even when mean and P99 remain low", () => {
  const width = 100;
  const height = 100;
  const expected = new Uint8ClampedArray(width * height * 4);
  const actual = new Uint8ClampedArray(width * height * 4);

  for (let index = 0; index < expected.length; index += 4) {
    expected[index] = 128;
    expected[index + 1] = 128;
    expected[index + 2] = 128;
    expected[index + 3] = 255;
    actual[index] = 128;
    actual[index + 1] = 128;
    actual[index + 2] = 128;
    actual[index + 3] = 255;
  }
  for (let pixel = 0; pixel < 10; pixel += 1) {
    actual[pixel * 4] = 154;
  }

  const result = compareRoundTripPixels({ expected, actual, width, height });

  assert.equal(result.channelErrorAbove08Count, 10);
  assert.equal(result.passed, false);
});
