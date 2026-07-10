import assert from "node:assert/strict";
import test from "node:test";
import { getCameraLutProfileById } from "../src/data/cameraLutProfiles";
import { importLocalTechnicalTransform } from "../src/services/technicalTransformService";
import type {
  ColorPreviewAdjustments,
  ParsedCubeLut,
  RgbColor,
  SupportedCubeSize,
  TechnicalTransformBinding
} from "../src/types";
import { generateCameraMonitoringCubeLut } from "../src/utils/cameraLutExport";
import { applyColorPipelineToRgb, applyRangeMapping } from "../src/utils/cubeCompose";
import { evaluateCubeLut } from "../src/utils/cubeEvaluator";
import { generateCubeLut, applyLookToRgb } from "../src/utils/cubeExport";
import { CubeParseError, parseCubeLut } from "../src/utils/cubeParser";
import { validateCubeLut } from "../src/utils/cubeValidate";

const identityAdjustments: ColorPreviewAdjustments = {
  intensity: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  shadowMatch: 50,
  midtoneMatch: 50,
  highlightMatch: 50,
  skinToneProtection: false,
  preserveLuma: false,
  preventOversaturation: false
};

const createCubeText = (
  size: SupportedCubeSize,
  transform: (input: RgbColor) => RgbColor,
  domainMin: RgbColor = { r: 0, g: 0, b: 0 },
  domainMax: RgbColor = { r: 1, g: 1, b: 1 }
): string => {
  const lines = [
    `TITLE "Test_${size}"`,
    `LUT_3D_SIZE ${size}`,
    `DOMAIN_MIN ${domainMin.r} ${domainMin.g} ${domainMin.b}`,
    `DOMAIN_MAX ${domainMax.r} ${domainMax.g} ${domainMax.b}`
  ];
  const maxIndex = size - 1;

  for (let blueIndex = 0; blueIndex < size; blueIndex += 1) {
    for (let greenIndex = 0; greenIndex < size; greenIndex += 1) {
      for (let redIndex = 0; redIndex < size; redIndex += 1) {
        const output = transform({ r: redIndex / maxIndex, g: greenIndex / maxIndex, b: blueIndex / maxIndex });
        lines.push(`${output.r.toFixed(8)} ${output.g.toFixed(8)} ${output.b.toFixed(8)}`);
      }
    }
  }

  return `${lines.join("\n")}\n`;
};

const assertRgbClose = (actual: RgbColor, expected: RgbColor, tolerance = 1e-6): void => {
  assert.ok(Math.abs(actual.r - expected.r) <= tolerance, `red ${actual.r} != ${expected.r}`);
  assert.ok(Math.abs(actual.g - expected.g) <= tolerance, `green ${actual.g} != ${expected.g}`);
  assert.ok(Math.abs(actual.b - expected.b) <= tolerance, `blue ${actual.b} != ${expected.b}`);
};

const createBinding = (parsedLut: ParsedCubeLut): TechnicalTransformBinding => ({
  fileName: "user-transform.cube",
  fileSize: 1024,
  sha256: "0".repeat(64),
  parsedLut,
  modelId: "sony-fx3",
  inputGamma: "S-Log3",
  inputGamut: "S-Gamut3.Cine",
  outputSpace: "Rec.709",
  verification: "user-supplied-unverified",
  importedAt: "2026-07-10T00:00:00.000Z"
});

test("parses an identity 17-point 3D cube", () => {
  const parsed = parseCubeLut(createCubeText(17, (input) => input));
  assert.equal(parsed.lut.size, 17);
  assert.equal(parsed.lut.data.length, 4913);
});

test("parses an identity 33-point 3D cube", () => {
  const parsed = parseCubeLut(createCubeText(33, (input) => input));
  assert.equal(parsed.lut.size, 33);
  assert.equal(parsed.lut.data.length, 35937);
});

test("rejects an incorrect 3D cube data-line count", () => {
  const content = createCubeText(17, (input) => input).split("\n").slice(0, -2).join("\n");
  assert.throws(() => parseCubeLut(content), (error: unknown) => error instanceof CubeParseError && error.message.includes("4913"));
});

test("rejects NaN RGB data", () => {
  const content = createCubeText(17, (input) => input).replace("0.00000000 0.00000000 0.00000000", "NaN 0 0");
  assert.throws(() => parseCubeLut(content), (error: unknown) => error instanceof CubeParseError && error.message.includes("NaN"));
});

test("rejects unsupported 1D LUT declarations", () => {
  const content = createCubeText(17, (input) => input).replace("LUT_3D_SIZE 17", "LUT_1D_SIZE 17");
  assert.throws(() => parseCubeLut(content), (error: unknown) => error instanceof CubeParseError && error.message.includes("仅支持 3D"));
});

test("rejects duplicate 3D size declarations", () => {
  const content = createCubeText(17, (input) => input).replace("LUT_3D_SIZE 17", "LUT_3D_SIZE 17\nLUT_3D_SIZE 17");
  assert.throws(() => parseCubeLut(content), (error: unknown) => error instanceof CubeParseError && error.message.includes("重复 LUT_3D_SIZE"));
});

test("rejects RGB output values outside zero to one", () => {
  const content = createCubeText(17, (input) => input).replace("0.00000000 0.00000000 0.00000000", "1.2 0 0");
  assert.throws(() => parseCubeLut(content), (error: unknown) => error instanceof CubeParseError && error.message.includes("超出 0 到 1"));
});

test("maps DOMAIN_MIN and DOMAIN_MAX before evaluation", () => {
  const parsed = parseCubeLut(
    createCubeText(17, (input) => input, { r: -1, g: -1, b: -1 }, { r: 1, g: 1, b: 1 })
  );
  assertRgbClose(evaluateCubeLut(parsed.lut, { r: 0, g: 0, b: 0 }), { r: 0.5, g: 0.5, b: 0.5 });
});

test("trilinear evaluation preserves identity LUT endpoints", () => {
  const lut = parseCubeLut(createCubeText(17, (input) => input)).lut;
  assertRgbClose(evaluateCubeLut(lut, { r: 0, g: 0, b: 0 }), { r: 0, g: 0, b: 0 });
  assertRgbClose(evaluateCubeLut(lut, { r: 1, g: 1, b: 1 }), { r: 1, g: 1, b: 1 });
});

test("trilinear evaluation preserves an identity LUT midpoint", () => {
  const lut = parseCubeLut(createCubeText(17, (input) => input)).lut;
  assertRgbClose(evaluateCubeLut(lut, { r: 0.5, g: 0.5, b: 0.5 }), { r: 0.5, g: 0.5, b: 0.5 });
});

test("applies technical transform before the creative look", () => {
  const invertLut = parseCubeLut(createCubeText(17, ({ r, g, b }) => ({ r: 1 - r, g: 1 - g, b: 1 - b }))).lut;
  const binding = createBinding(invertLut);
  const adjustments: ColorPreviewAdjustments = { ...identityAdjustments, intensity: 100, temperature: 30, tint: -12 };
  const input = { r: 0.2, g: 0.4, b: 0.7 };
  const actual = applyColorPipelineToRgb(input, {
    inputTechnicalTransform: binding,
    creativeLookTransform: { adjustments },
    monitorAdjustment: { brightnessOffsetEv: 0 },
    rangeMapping: "full"
  });
  const technicalThenCreative = applyLookToRgb(evaluateCubeLut(invertLut, input), adjustments);
  const incorrectCreativeThenTechnical = evaluateCubeLut(invertLut, applyLookToRgb(input, adjustments));

  assertRgbClose(actual, technicalThenCreative);
  assert.notDeepEqual(actual, incorrectCreativeThenTechnical);
});

test("keeps Full Range values unchanged", () => {
  assertRgbClose(applyRangeMapping({ r: 0, g: 0.5, b: 1 }, "full"), { r: 0, g: 0.5, b: 1 });
});

test("maps Legal Range to 16-235 code values", () => {
  const output = applyRangeMapping({ r: 0, g: 0.5, b: 1 }, "legal");
  assertRgbClose(output, { r: 16 / 255, g: (16 + 219 * 0.5) / 255, b: 235 / 255 });
});

test("POST export remains valid and keeps TITLE aligned with the filename", () => {
  const result = generateCubeLut({ lutName: "POST_Test", lookName: "Test", lutSize: 17, adjustments: identityAdjustments });
  const validation = validateCubeLut(result.content);
  const parsed = parseCubeLut(result.content);
  assert.equal(validation.isValid, true);
  assert.equal(result.fileName, `${parsed.lut.title}.cube`);
  assert.equal(result.exportTypeCode, "POST");
});

test("CAMMON_TEST export remains valid and records an unverified local transform", () => {
  const profile = getCameraLutProfileById("sony-fx3");
  const technicalTransform = createBinding(parseCubeLut(createCubeText(17, (input) => input)).lut);
  const result = generateCameraMonitoringCubeLut({
    lutName: "CAMMON_TEST_Sony_FX3",
    profile,
    requestedCubeSize: 17,
    selectedLogProfile: "S-Log3",
    selectedGamut: "S-Gamut3.Cine",
    lutUseType: "monitoring",
    range: "full",
    exposureConfig: { mode: "standard", lutBrightnessOffsetEv: 0 },
    adjustments: identityAdjustments,
    technicalTransform
  });
  const validation = validateCubeLut(result.content);
  const parsed = parseCubeLut(result.content);
  assert.equal(validation.isValid, true);
  assert.equal(result.verificationStatus, "TEST");
  assert.equal(result.technicalTransformVerification, "user-supplied-unverified");
  assert.equal(result.fileName, `${parsed.lut.title}.cube`);
  assert.match(result.content, /# Community Advice Included: false/);
});

test("imports a local 3D cube without upgrading an unregistered hash to official", async () => {
  const content = createCubeText(17, (input) => input);
  const file = new File([content], "Sony_SLog3_Local.cube", { type: "text/plain" });
  const result = await importLocalTechnicalTransform({
    file,
    modelId: "sony-fx3",
    inputGamma: "S-Log3",
    inputGamut: "S-Gamut3.Cine"
  });

  assert.equal(result.binding.parsedLut.size, 17);
  assert.equal(result.binding.verification, "user-supplied-unverified");
  assert.equal(result.binding.sha256.length, 64);
  assert.ok(result.warnings.some((warning) => warning.includes("不会") || warning.includes("无法")));
});
