import assert from "node:assert/strict";
import test from "node:test";
import type { ColorPipelineDefinition, InputColorConfig, LutParameters } from "../src/types";
import { validationScenes } from "../src/data/validationScenes";
import { applyLookToRgb } from "../src/utils/cubeExport";
import { analyzeRgbaPixels } from "../src/utils/colorAnalysis";
import {
  applyAutoColorSuggestion,
  applyColorPipelineForValidation,
  createAnalysisParameterSnapshot,
  createAutoColorAnalysis,
  createAutoColorSuggestion,
  createLutValidationReport,
  formatLutValidationMarkdown,
  getInputReadiness,
  restoreAnalysisParameterSnapshot
} from "../src/utils/lutValidation";

const createPixels = (colors: readonly (readonly [number, number, number])[]): Uint8ClampedArray => {
  const data = new Uint8ClampedArray(colors.length * 4);

  colors.forEach((color, index) => {
    const offset = index * 4;
    data[offset] = color[0];
    data[offset + 1] = color[1];
    data[offset + 2] = color[2];
    data[offset + 3] = 255;
  });

  return data;
};

const createParameters = (overrides: Partial<LutParameters> = {}): LutParameters => ({
  intensity: 50,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  shadowMatch: 50,
  midtoneMatch: 50,
  highlightMatch: 50,
  inputColorSpace: "Rec.709",
  precision: "33x33x33",
  ...overrides
});

const rec709Config: InputColorConfig = {
  brandId: "generic",
  profileId: "generic-rec709",
  inputType: "rec709",
  recommendedWorkflow: "完成基础曝光和白平衡后，可测试创意 LUT。",
  canUseCreativeLutDirectly: true
};

const logConfig: InputColorConfig = {
  brandId: "sony",
  profileId: "sony-slog3",
  inputType: "log",
  gamma: "S-Log3",
  gamut: "S-Gamut3.Cine",
  recommendedWorkflow: "先完成技术还原。",
  canUseCreativeLutDirectly: false
};

const analyze = (targetColors: readonly (readonly [number, number, number])[], referenceColors: readonly (readonly [number, number, number])[]) => {
  const target = analyzeRgbaPixels(createPixels(targetColors), targetColors.length, 1);
  const reference = analyzeRgbaPixels(createPixels(referenceColors), referenceColors.length, 1);
  return createAutoColorAnalysis(target, reference, { inputColorConfig: rec709Config });
};

test("identity target and reference produce no meaningful recommended offset", () => {
  const analysis = analyze([[128, 128, 128], [128, 128, 128]], [[128, 128, 128], [128, 128, 128]]);
  const current = createParameters();
  const suggestion = createAutoColorSuggestion(current, analysis);

  assert.equal(suggestion.parameters.contrast, 0);
  assert.equal(suggestion.parameters.saturation, 0);
  assert.equal(suggestion.parameters.temperature, 0);
  assert.equal(suggestion.parameters.tint, 0);
  assert.equal(suggestion.parameters.shadowMatch, 50);
  assert.equal(suggestion.parameters.midtoneMatch, 50);
  assert.equal(suggestion.parameters.highlightMatch, 50);
});

test("underexposed target receives a conservative lifting recommendation", () => {
  const analysis = analyze([[18, 18, 18], [26, 26, 26]], [[122, 122, 122], [135, 135, 135]]);
  const suggestion = createAutoColorSuggestion(createParameters(), analysis);

  assert.ok(analysis.exposureDifference > 0.3);
  assert.ok(suggestion.parameters.shadowMatch > 50);
  assert.ok(suggestion.parameters.midtoneMatch > 50);
  assert.ok(suggestion.parameters.highlightMatch <= 58);
});

test("warm reference creates a bounded positive temperature recommendation", () => {
  const analysis = analyze([[128, 128, 128]], [[176, 132, 92]]);
  const suggestion = createAutoColorSuggestion(createParameters(), analysis);

  assert.ok(analysis.temperatureDifference > 0);
  assert.ok(suggestion.parameters.temperature > 0);
  assert.ok(suggestion.parameters.temperature <= 18);
});

test("high saturation red enables protection and caps saturation recommendation", () => {
  const analysis = analyze([[240, 28, 20], [238, 30, 22]], [[245, 26, 18], [242, 30, 20]]);
  const suggestion = createAutoColorSuggestion(createParameters({ saturation: 18 }), analysis);

  assert.equal(suggestion.preventOversaturation, true);
  assert.ok(suggestion.parameters.saturation <= 4);
  assert.ok(analysis.risks.some((risk) => risk.includes("高饱和红色")));
});

test("near clipping highlights avoid aggressive contrast and protect highlights", () => {
  const analysis = analyze([[250, 250, 250], [254, 254, 254]], [[252, 252, 252], [255, 255, 255]]);
  const suggestion = createAutoColorSuggestion(createParameters({ contrast: 8, highlightMatch: 50 }), analysis);

  assert.ok(suggestion.parameters.contrast <= 12);
  assert.ok(suggestion.parameters.highlightMatch >= 55);
});

test("near zero shadows are not recommended to become darker", () => {
  const analysis = analyze([[1, 1, 1], [3, 3, 3]], [[1, 1, 1], [3, 3, 3]]);
  const suggestion = createAutoColorSuggestion(createParameters({ shadowMatch: 50 }), analysis);

  assert.ok(suggestion.parameters.shadowMatch >= 52);
  assert.ok(analysis.risks.some((risk) => risk.includes("阴影接近裁切")));
});

test("unrestored Log input remains an experimental low confidence analysis", () => {
  const readiness = getInputReadiness({ inputColorConfig: logConfig });

  assert.equal(readiness.readiness, "experimental-log");
  assert.equal(readiness.confidence, "low");
  assert.ok(readiness.risks.length > 0);
});

test("applied auto suggestion can restore the exact prior parameter snapshot", () => {
  const current = createParameters({ contrast: 7, temperature: -3 });
  const snapshot = createAnalysisParameterSnapshot(current, true, true, false);
  const analysis = analyze([[100, 100, 100]], [[150, 130, 110]]);
  const suggestion = createAutoColorSuggestion(current, analysis);
  const applied = applyAutoColorSuggestion(current, suggestion);
  const restored = restoreAnalysisParameterSnapshot(snapshot);

  assert.notDeepEqual(applied, current);
  assert.deepEqual(restored.parameters, current);
  assert.equal(restored.skinToneProtection, true);
  assert.equal(restored.preserveLuma, true);
  assert.equal(restored.preventOversaturation, false);
});

test("validation pixel processing uses the same RGB look mapping as LUT export", () => {
  const parameters = createParameters({ intensity: 75, contrast: 12, saturation: 8, temperature: 4, shadowMatch: 56, midtoneMatch: 54, highlightMatch: 58 });
  const pipeline: ColorPipelineDefinition = {
    creativeLookTransform: {
      adjustments: {
        ...parameters,
        skinToneProtection: true,
        preserveLuma: true,
        preventOversaturation: true
      }
    },
    monitorAdjustment: { brightnessOffsetEv: 0 },
    rangeMapping: "full"
  };
  const source = createPixels([[128, 112, 96]]);
  const processed = applyColorPipelineForValidation(source, 1, 1, pipeline);
  const expected = applyLookToRgb(
    { r: 128 / 255, g: 112 / 255, b: 96 / 255 },
    pipeline.creativeLookTransform.adjustments
  );

  assert.equal(processed.pixels[0], Math.round(expected.r * 255));
  assert.equal(processed.pixels[1], Math.round(expected.g * 255));
  assert.equal(processed.pixels[2], Math.round(expected.b * 255));
  assert.equal(processed.rgbOutOfRangeCount, 0);
});

test("progressive controls leave the shared parameter value untouched until a setter is invoked", () => {
  const parameters = createParameters({ contrast: 9, shadowMatch: 57 });
  const isAdvancedOpen = false;
  const nextIsAdvancedOpen = !isAdvancedOpen;

  assert.equal(nextIsAdvancedOpen, true);
  assert.deepEqual(parameters, createParameters({ contrast: 9, shadowMatch: 57 }));
});

test("six validation scenes retain the required material roles and emit a readable report", () => {
  const expectedSceneIds = [
    "portrait-normal",
    "portrait-close",
    "blue-sky",
    "blue-sky-greenery",
    "daylight-high-contrast",
    "saturated-red"
  ];
  const target = analyzeRgbaPixels(createPixels([[128, 128, 128]]), 1, 1);
  const report = createLutValidationReport(validationScenes[0], "ready", target, target, 0, 0);
  const markdown = formatLutValidationMarkdown(report);

  assert.deepEqual(validationScenes.map((scene) => scene.id), expectedSceneIds);
  validationScenes.forEach((scene) => {
    assert.deepEqual(scene.expectedRoles, ["log-source", "normalized-rec709", "target-look", "reference-look"]);
  });
  assert.ok(markdown.includes("处理前亮度 P05 / P50 / P95"));
  assert.ok(markdown.includes("风险归类"));
});
