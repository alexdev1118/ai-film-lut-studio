import assert from "node:assert/strict";
import test from "node:test";
import { getCameraLutProfileById } from "../src/data/cameraLutProfiles";
import { defaultCameraProfile, toInputColorConfig } from "../src/data/cameraProfiles";
import { colorEncodingProfiles, getColorEncodingProfile } from "../src/data/colorEncodingProfiles";
import { validationScenes } from "../src/data/validationScenes";
import { demoTargetImage } from "../src/data/demoProject";
import { lutStrengthValidationFixtures } from "../src/data/lutStrengthFixtures";
import { lutStyles } from "../src/data/styles";
import { importLocalTechnicalTransform } from "../src/services/technicalTransformService";
import { preparePostLut } from "../src/services/lutRenderService";
import type {
  ColorPreviewAdjustments,
  CubeDownloadArtifact,
  ImageColorStatistics,
  ParsedCubeLut,
  RgbColor,
  SupportedCubeSize,
  TechnicalTransformBinding
} from "../src/types";
import { generateCameraMonitoringCubeLut } from "../src/utils/cameraLutExport";
import { revokeColorPreviewUrl } from "../src/utils/colorPreview";
import {
  compressSignalRange,
  decodeBt1886Gamma24Channel,
  decodeGamma22Channel,
  decodeSrgbChannel,
  defaultDpxInterpretation,
  encodeBt1886Gamma24Channel,
  encodeGamma22Channel,
  encodeSrgbChannel,
  expandSignalRange,
  inputColorToRec709Gamma24,
  rec709Gamma24ToDisplaySrgb
} from "../src/utils/colorSpace";
import { applyColorPipelineToRgb, applyRangeMapping } from "../src/utils/cubeCompose";
import { evaluateCubeLut } from "../src/utils/cubeEvaluator";
import { generateCubeLut, applyLookToRgb, applyLookToRgbWithDiagnostics } from "../src/utils/cubeExport";
import { buildCubeDownloadArtifact, triggerCubeDownloadArtifact } from "../src/utils/cubeDownload";
import { compressRgbToDisplayGamut, getOklabChroma, getOklabHueDegrees, hueDistanceDegrees } from "../src/utils/gamutCompression";
import { CubeParseError, parseCubeLut } from "../src/utils/cubeParser";
import { validateCubeLut } from "../src/utils/cubeValidate";
import { stableSerialize } from "../src/utils/contentHash";
import {
  calculateCubeConsistency,
  createPostConfigurationSignature,
  createCubeContentHash,
  createInputInterpretationHash,
  createLutStressTestReport,
  createPostParameterHash
} from "../src/utils/lutConsistency";
import { analyzeLutStrengthDiagnostics } from "../src/utils/lutStrengthDiagnostics";
import { createLutStrengthValidationMatrix } from "../src/utils/lutStrengthValidation";
import { defaultLutParameters } from "../src/utils/lutMock";
import { LatestRequestGate } from "../src/utils/latestRequestGate";
import { compareRoundTripPixels } from "../src/utils/roundTripComparison";
import { applyLutStyleToWorkspace, createStyleWorkspaceQuery, parseLutStyleStrength } from "../src/utils/styleSelection";

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

const createDownloadArtifactFixture = (): CubeDownloadArtifact => {
  const text = "TITLE \"Test\"\n";
  return {
    filename: "POST_BT709_G24_FULL_Test_33pt_v1.cube",
    text,
    blob: new Blob([text], { type: "text/plain;charset=utf-8" }),
    mimeType: "text/plain;charset=utf-8",
    byteLength: new TextEncoder().encode(text).byteLength,
    sha256: "a".repeat(64),
    parameterHash: "b".repeat(64),
    cubeHash: "a".repeat(64),
    lutSize: 33,
    inputContract: "BT.709 / Gamma 2.4 / Full",
    outputContract: "BT.709 / Gamma 2.4 / Full"
  };
};

test("default demo target is a deterministic local image resource", () => {
  assert.match(demoTargetImage.url, /^data:image\/svg\+xml;charset=utf-8,/);
  assert.equal(demoTargetImage.width, 1600);
  assert.equal(demoTargetImage.height, 900);
  assert.equal(demoTargetImage.inputState, "rec709");
});

test("builds a validated deterministic download artifact from the prepared POST LUT", async () => {
  const style = lutStyles.find((candidate) => candidate.id === "print-2383-inspired");

  if (style === undefined) {
    throw new Error("Required Print 2383 style definition is missing.");
  }

  const application = applyLutStyleToWorkspace(style, 50);
  const prepared = await preparePostLut({
    lutName: "POST_BT709_G24_FULL_Print_2383_Inspired_33pt_v1",
    lookName: style.name,
    lutSize: 33,
    parameters: {
      ...defaultLutParameters,
      ...application.parameters,
      precision: "33x33x33"
    },
    skinToneProtection: application.skinToneProtection,
    preserveLuma: application.preserveLuma,
    preventOversaturation: application.preventOversaturation,
    referenceColorInterpretation: defaultDpxInterpretation()
  });
  const artifact = await buildCubeDownloadArtifact(prepared);
  const repeatedArtifact = await buildCubeDownloadArtifact(prepared);
  const blobText = await artifact.blob.text();
  const validation = validateCubeLut(blobText);
  const parsed = parseCubeLut(blobText);

  assert.equal(artifact.filename, prepared.cubeResult.fileName);
  assert.equal(artifact.text, prepared.cubeResult.content);
  assert.equal(blobText, artifact.text);
  assert.ok(artifact.byteLength > 0);
  assert.equal(artifact.blob.size, artifact.byteLength);
  assert.equal(artifact.sha256, prepared.cubeHash);
  assert.equal(artifact.cubeHash, prepared.cubeHash);
  assert.equal(artifact.parameterHash, prepared.parameterHash);
  assert.equal(artifact.lutSize, 33);
  assert.equal(validation.isValid, true);
  assert.equal(validation.dataLineCount, 35937);
  assert.equal(parsed.lut.data.length, 35937);
  assert.equal(repeatedArtifact.sha256, artifact.sha256);
  assert.equal(repeatedArtifact.cubeHash, artifact.cubeHash);
  assert.equal(repeatedArtifact.text, artifact.text);

  const comparisonStyle = lutStyles.find((candidate) => candidate.id === "natural-skin");
  if (comparisonStyle === undefined) {
    throw new Error("Required Natural Skin style definition is missing.");
  }
  const comparisonApplication = applyLutStyleToWorkspace(comparisonStyle, 50);
  const comparisonPrepared = await preparePostLut({
    lutName: "POST_BT709_G24_FULL_Natural_Skin_33pt_v1",
    lookName: comparisonStyle.name,
    lutSize: 33,
    parameters: {
      ...defaultLutParameters,
      ...comparisonApplication.parameters,
      precision: "33x33x33"
    },
    skinToneProtection: comparisonApplication.skinToneProtection,
    preserveLuma: comparisonApplication.preserveLuma,
    preventOversaturation: comparisonApplication.preventOversaturation,
    referenceColorInterpretation: defaultDpxInterpretation()
  });
  const comparisonArtifact = await buildCubeDownloadArtifact(comparisonPrepared);

  assert.notEqual(comparisonArtifact.parameterHash, artifact.parameterHash);
  assert.notEqual(comparisonArtifact.cubeHash, artifact.cubeHash);
  assert.notEqual(comparisonArtifact.sha256, artifact.sha256);
  assert.notEqual(comparisonArtifact.text, artifact.text);
});

test("requests a browser download before delayed object URL revocation", () => {
  const events: string[] = [];
  const scheduledCleanups: Array<() => void> = [];
  const artifact = createDownloadArtifactFixture();
  const anchor = {
    href: "",
    download: "",
    rel: "",
    style: { display: "" },
    appendToDocument: () => events.push("append-anchor"),
    click: () => events.push("click"),
    remove: () => events.push("remove")
  };

  triggerCubeDownloadArtifact(artifact, {
    createObjectUrl: () => {
      events.push("create-url");
      return "blob:test-download";
    },
    revokeObjectUrl: () => events.push("revoke-url"),
    createAnchor: () => {
      events.push("create-anchor");
      return anchor;
    },
    scheduleCleanup: (callback, delayMs) => {
      events.push(`schedule-${delayMs}`);
      scheduledCleanups.push(callback);
    }
  });

  assert.equal(anchor.href, "blob:test-download");
  assert.equal(anchor.download, artifact.filename);
  assert.equal(anchor.rel, "noopener");
  assert.equal(anchor.style.display, "none");
  assert.deepEqual(events.slice(0, 6), ["create-url", "create-anchor", "append-anchor", "click", "remove", "schedule-10000"]);
  assert.equal(events.includes("revoke-url"), false);
  const scheduledCleanup = scheduledCleanups[0];
  if (scheduledCleanup === undefined) {
    throw new Error("Expected delayed object URL cleanup to be scheduled.");
  }
  scheduledCleanup();
  assert.equal(events.at(-1), "revoke-url");
});

test("retries the same verified artifact without changing its content or hash", () => {
  const artifact = createDownloadArtifactFixture();
  let clickCount = 0;
  const scheduledCleanups: Array<() => void> = [];
  const runtime = {
    createObjectUrl: (blob: Blob) => {
      assert.equal(blob, artifact.blob);
      return `blob:retry-${clickCount}`;
    },
    revokeObjectUrl: () => undefined,
    createAnchor: () => ({
      href: "",
      download: "",
      rel: "",
      style: { display: "" },
      appendToDocument: () => undefined,
      click: () => {
        clickCount += 1;
      },
      remove: () => undefined
    }),
    scheduleCleanup: (callback: () => void) => scheduledCleanups.push(callback)
  };

  const first = triggerCubeDownloadArtifact(artifact, runtime);
  const second = triggerCubeDownloadArtifact(artifact, runtime);

  assert.equal(clickCount, 2);
  assert.equal(scheduledCleanups.length, 2);
  assert.equal(first.cubeHash, artifact.cubeHash);
  assert.equal(second.cubeHash, artifact.cubeHash);
  assert.equal(first.filename, second.filename);
  assert.equal(first.byteLength, second.byteLength);
});

test("style workspace selection preserves only supported preview strengths", () => {
  assert.equal(createStyleWorkspaceQuery("print-2383-inspired", 100), "style=print-2383-inspired&strength=100");
  assert.equal(parseLutStyleStrength("35"), 35);
  assert.equal(parseLutStyleStrength("50"), 50);
  assert.equal(parseLutStyleStrength("70"), 70);
  assert.equal(parseLutStyleStrength("100"), 100);
  assert.equal(parseLutStyleStrength("65"), undefined);
  assert.equal(parseLutStyleStrength("100.0"), undefined);
  assert.equal(parseLutStyleStrength(null), undefined);
});

test("applying a style creates an independent complete workspace parameter snapshot", () => {
  const printStyle = lutStyles.find((style) => style.id === "print-2383-inspired");
  const portraitStyle = lutStyles.find((style) => style.id === "natural-skin");

  if (printStyle === undefined || portraitStyle === undefined) {
    throw new Error("Required built-in style definition is missing.");
  }

  const printApplication = applyLutStyleToWorkspace(printStyle, 70);
  const portraitApplication = applyLutStyleToWorkspace(portraitStyle);

  assert.equal(printApplication.styleId, "print-2383-inspired");
  assert.equal(printApplication.parameters.intensity, 70);
  assert.equal(printApplication.parameters.contrast, 14);
  assert.equal(printApplication.parameters.saturation, 4);
  assert.equal(printApplication.skinToneProtection, true);
  assert.equal(printApplication.preserveLuma, true);
  assert.equal(printApplication.preventOversaturation, true);
  assert.notEqual(printApplication.parameters, printStyle.adjustments);
  assert.notDeepEqual(printApplication.parameters, portraitApplication.parameters);
});

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

test("formal style library contains twelve original traceable Cube-ready definitions", () => {
  assert.equal(lutStyles.length, 12);
  assert.equal(new Set(lutStyles.map((style) => style.id)).size, lutStyles.length);

  for (const style of lutStyles) {
    assert.ok(style.provenance.type === "original-authored" || style.provenance.type === "inspired-by-public-characteristics");
    assert.equal(style.license.redistributionAllowed, true);
    assert.equal(style.compatibility.inputContract, "bt709-g24-full");
    assert.equal(style.compatibility.outputContract, "bt709-g24-full");
    assert.deepEqual(style.compatibility.cubeSizes, [17, 33, 65]);
    assert.deepEqual(style.compatibility.strengths, [35, 50, 70, 100]);
    assert.equal(style.previewImage.includes("https://"), false);
    assert.equal(style.previewImage.includes("http://"), false);

    const generated = generateCubeLut({
      lutName: `POST_${style.id}`,
      lookName: style.name,
      lutSize: 17,
      adjustments: style.adjustments
    });
    const validation = validateCubeLut(generated.content);
    assert.equal(validation.isValid, true, style.id);
    assert.equal(validation.dataLineCount, 17 ** 3, style.id);
  }
});

test("formal styles produce distinct, stable 33-point Cube content from their applied parameters", async () => {
  const parameterHashes = new Set<string>();
  const cubeHashes = new Set<string>();

  for (const style of lutStyles) {
    const application = applyLutStyleToWorkspace(style, style.recommendedIntensity);
    const parameterHash = await createPostParameterHash({
      adjustments: {
        ...application.parameters,
        skinToneProtection: application.skinToneProtection,
        preserveLuma: application.preserveLuma,
        preventOversaturation: application.preventOversaturation
      },
      lutSize: 33
    });
    const firstCube = generateCubeLut({
      lutName: "POST_STYLE_RUNTIME",
      lookName: "Style runtime verification",
      lutSize: 33,
      adjustments: {
        ...application.parameters,
        skinToneProtection: application.skinToneProtection,
        preserveLuma: application.preserveLuma,
        preventOversaturation: application.preventOversaturation
      },
      parameterHash
    });
    const secondCube = generateCubeLut({
      lutName: "POST_STYLE_RUNTIME",
      lookName: "Style runtime verification",
      lutSize: 33,
      adjustments: {
        ...application.parameters,
        skinToneProtection: application.skinToneProtection,
        preserveLuma: application.preserveLuma,
        preventOversaturation: application.preventOversaturation
      },
      parameterHash
    });
    const firstCubeHash = await createCubeContentHash(firstCube.content);
    const secondCubeHash = await createCubeContentHash(secondCube.content);

    assert.equal(validateCubeLut(firstCube.content).isValid, true, style.id);
    assert.equal(firstCubeHash, secondCubeHash, `${style.id} must generate a stable Cube`);
    parameterHashes.add(parameterHash);
    cubeHashes.add(firstCubeHash);
  }

  assert.equal(parameterHashes.size, lutStyles.length);
  assert.equal(cubeHashes.size, lutStyles.length);
});

test("every formal style passes the procedural six-scene strength and gamut matrix", () => {
  for (const style of lutStyles) {
    const matrix = createLutStrengthValidationMatrix(lutStrengthValidationFixtures, style.adjustments);
    assert.equal(matrix.scenes.length, 6, style.id);
    assert.equal(matrix.allScenesMonotonic, true, style.id);
    for (const scene of matrix.scenes) {
      for (const result of scene.results) {
        assert.equal(result.diagnostics.postCompressionOutOfGamutRatio, 0, `${style.id}:${scene.sceneId}:${result.strength}`);
        assert.ok(
          result.diagnostics.hueDriftP95 <= 25,
          JSON.stringify({ styleId: style.id, sceneId: scene.sceneId, strength: result.strength, diagnostics: result.diagnostics })
        );
      }
    }
  }
});

test("skin protection does not classify saturated red as skin", () => {
  const saturatedRed: RgbColor = { r: 0.9, g: 0.08, b: 0.04 };
  const protectedResult = applyLookToRgbWithDiagnostics(saturatedRed, {
    ...identityAdjustments,
    intensity: 100,
    contrast: 18,
    saturation: 2,
    shadowMatch: 43,
    midtoneMatch: 58,
    highlightMatch: 62,
    skinToneProtection: true,
    preserveLuma: true,
    preventOversaturation: true
  });
  const unprotectedResult = applyLookToRgbWithDiagnostics(saturatedRed, {
    ...identityAdjustments,
    intensity: 100,
    contrast: 18,
    saturation: 2,
    shadowMatch: 43,
    midtoneMatch: 58,
    highlightMatch: 62,
    skinToneProtection: false,
    preserveLuma: true,
    preventOversaturation: true
  });

  assertRgbClose(protectedResult.color, unprotectedResult.color, 1e-9);
});

const assertRgbClose = (actual: RgbColor, expected: RgbColor, tolerance = 1e-6): void => {
  assert.ok(Math.abs(actual.r - expected.r) <= tolerance, `red ${actual.r} != ${expected.r}`);
  assert.ok(Math.abs(actual.g - expected.g) <= tolerance, `green ${actual.g} != ${expected.g}`);
  assert.ok(Math.abs(actual.b - expected.b) <= tolerance, `blue ${actual.b} != ${expected.b}`);
};

test("hue-preserving gamut compression contains saturated colors without rotating hue", () => {
  const input = { r: 1.32, g: 0.18, b: -0.08 };
  const inputHue = getOklabHueDegrees(input);
  const result = compressRgbToDisplayGamut(input, { protectionStrength: 1 });
  const outputHue = getOklabHueDegrees(result.color);

  assert.ok(result.color.r >= 0 && result.color.r <= 1);
  assert.ok(result.color.g >= 0 && result.color.g <= 1);
  assert.ok(result.color.b >= 0 && result.color.b <= 1);
  assert.equal(result.wasOutOfGamut, true);
  assert.ok(result.chromaReduction > 0);
  assert.ok(hueDistanceDegrees(inputHue, outputHue) <= 1.5);
});

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

const createStatistics = (overrides: Partial<ImageColorStatistics> = {}): ImageColorStatistics => ({
  pixelCount: 1000,
  rgb: {
    average: { r: 0.46, g: 0.45, b: 0.44 },
    median: { r: 0.45, g: 0.44, b: 0.43 }
  },
  luminanceAverage: 0.45,
  luminance: { p05: 0.08, p25: 0.25, p50: 0.45, p75: 0.68, p95: 0.9 },
  blackClipRatio: 0.002,
  highlightClipRatio: 0.003,
  saturationAverage: 0.28,
  saturationP95: 0.68,
  temperatureBias: 0,
  tintBias: 0,
  highSaturationRedRatio: 0.004,
  shadows: { pixelCount: 300, average: { r: 0.16, g: 0.15, b: 0.14 }, averageSaturation: 0.2 },
  midtones: { pixelCount: 450, average: { r: 0.48, g: 0.45, b: 0.42 }, averageSaturation: 0.28 },
  highlights: { pixelCount: 250, average: { r: 0.82, g: 0.81, b: 0.8 }, averageSaturation: 0.18 },
  ...overrides
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

test("style strength zero remains identity with reference color and saturation protection", () => {
  const input = { r: 1, g: 0.42, b: 0.18 };
  const adjustments: ColorPreviewAdjustments = {
    ...identityAdjustments,
    intensity: 0,
    contrast: 42,
    saturation: 55,
    temperature: 18,
    tint: -9,
    shadowMatch: 62,
    midtoneMatch: 68,
    highlightMatch: 58,
    skinToneProtection: true,
    preserveLuma: true,
    preventOversaturation: true
  };

  assertRgbClose(applyLookToRgb(input, adjustments, { r: 0.2, g: 0.7, b: 0.9 }), input);
});

test("style strength fifty is the midpoint between identity and the full look", () => {
  const input = { r: 0.26, g: 0.48, b: 0.74 };
  const reference = { r: 0.72, g: 0.38, b: 0.24 };
  const base: ColorPreviewAdjustments = {
    ...identityAdjustments,
    contrast: 38,
    saturation: 34,
    temperature: 12,
    tint: 7,
    shadowMatch: 58,
    midtoneMatch: 64,
    highlightMatch: 55,
    preserveLuma: true,
    preventOversaturation: true
  };
  const full = applyLookToRgb(input, { ...base, intensity: 100 }, reference);
  const half = applyLookToRgb(input, { ...base, intensity: 50 }, reference);

  assertRgbClose(half, {
    r: input.r + (full.r - input.r) * 0.5,
    g: input.g + (full.g - input.g) * 0.5,
    b: input.b + (full.b - input.b) * 0.5
  });
});

test("style strength one hundred returns the complete look", () => {
  const input = { r: 0.31, g: 0.52, b: 0.73 };
  const adjustments: ColorPreviewAdjustments = {
    ...identityAdjustments,
    intensity: 100,
    contrast: 24,
    saturation: 18,
    temperature: 9,
    tint: -4,
    shadowMatch: 56,
    midtoneMatch: 61,
    highlightMatch: 54
  };
  const complete = applyLookToRgb(input, adjustments);
  const repeated = applyLookToRgb(input, { ...adjustments, intensity: 100 });
  assertRgbClose(complete, repeated);
  assert.notDeepEqual(complete, input);
});

test("saturated red cyan and green looks remain hue-stable and increase monotonically with strength", () => {
  const inputs: readonly RgbColor[] = [
    { r: 0.21, g: 0.025, b: 0.018 },
    { r: 0.82, g: 0.22, b: 0.06 },
    { r: 0.04, g: 0.78, b: 0.92 },
    { r: 0.08, g: 0.86, b: 0.18 }
  ];
  const base: ColorPreviewAdjustments = {
    ...identityAdjustments,
    contrast: 46,
    saturation: 88,
    shadowMatch: 58,
    midtoneMatch: 64,
    highlightMatch: 58,
    preserveLuma: true,
    preventOversaturation: true
  };

  for (const input of inputs) {
    const outputs = [35, 50, 70, 100].map((intensity) => applyLookToRgb(input, { ...base, intensity }));
    const distances = outputs.map((output) => Math.hypot(output.r - input.r, output.g - input.g, output.b - input.b));
    const sourceHue = getOklabHueDegrees(input);
    const fullHue = getOklabHueDegrees(outputs[3] ?? input);

    assert.ok(distances[0] !== undefined && distances[1] !== undefined && distances[2] !== undefined && distances[3] !== undefined);
    assert.ok(distances[0] < distances[1]);
    assert.ok(distances[1] < distances[2]);
    assert.ok(distances[2] < distances[3]);
    assert.ok(
      hueDistanceDegrees(sourceHue, fullHue) <= 8,
      JSON.stringify({ input, sourceHue, fullHue, hueDistance: hueDistanceDegrees(sourceHue, fullHue), full: outputs[3] })
    );
  }
});

test("explicit temperature and tint retain bounded hue drift for saturated colors", () => {
  const inputs: readonly RgbColor[] = [
    { r: 0.21, g: 0.025, b: 0.018 },
    { r: 0.93, g: 0.08, b: 0.03 },
    { r: 0.04, g: 0.82, b: 0.94 },
    { r: 0.06, g: 0.92, b: 0.12 }
  ];
  const adjustments: ColorPreviewAdjustments = {
    ...identityAdjustments,
    intensity: 100,
    contrast: 28,
    saturation: 32,
    temperature: 12,
    tint: -8,
    shadowMatch: 57,
    midtoneMatch: 62,
    highlightMatch: 56,
    preserveLuma: true,
    preventOversaturation: true
  };

  for (const input of inputs) {
    const output = applyLookToRgb(input, adjustments);
    const drift = hueDistanceDegrees(getOklabHueDegrees(input), getOklabHueDegrees(output));
    assert.ok(drift <= 20, JSON.stringify({ input, output, drift }));
  }
});

test("LUT strength diagnostics report gamut neutral hue and skin safety metrics", () => {
  const samples: readonly RgbColor[] = [
    { r: 0.08, g: 0.08, b: 0.08 },
    { r: 0.5, g: 0.5, b: 0.5 },
    { r: 0.92, g: 0.92, b: 0.92 },
    { r: 0.72, g: 0.48, b: 0.34 },
    { r: 0.95, g: 0.08, b: 0.03 },
    { r: 0.04, g: 0.82, b: 0.94 },
    { r: 0.06, g: 0.92, b: 0.12 }
  ];
  const diagnostics = analyzeLutStrengthDiagnostics(samples, {
    ...identityAdjustments,
    intensity: 100,
    contrast: 46,
    saturation: 88,
    shadowMatch: 58,
    midtoneMatch: 64,
    highlightMatch: 58,
    skinToneProtection: true,
    preserveLuma: true,
    preventOversaturation: true
  });

  assert.equal(diagnostics.sampleCount, samples.length);
  assert.ok(diagnostics.preCompressionOutOfGamutRatio > 0);
  assert.equal(diagnostics.postCompressionOutOfGamutRatio, 0);
  assert.ok(diagnostics.clippedChannelRatio <= 0.1, JSON.stringify(diagnostics));
  assert.ok(diagnostics.neutralAxisError <= 0.01, JSON.stringify(diagnostics));
  assert.ok(diagnostics.hueDriftP95 <= 8, JSON.stringify(diagnostics));
  assert.ok(diagnostics.skinHueError <= 8, JSON.stringify(diagnostics));
  assert.ok(diagnostics.maximumChromaReduction > 0);
});

test("six procedural scenes remain monotonic across 35 50 70 and 100 percent strength", () => {
  const matrix = createLutStrengthValidationMatrix(lutStrengthValidationFixtures, {
    ...identityAdjustments,
    contrast: 28,
    saturation: 32,
    temperature: 4,
    tint: -2,
    shadowMatch: 57,
    midtoneMatch: 62,
    highlightMatch: 56,
    skinToneProtection: true,
    preserveLuma: true,
    preventOversaturation: true
  });

  assert.equal(matrix.scenes.length, 6);
  assert.ok(matrix.scenes.every((scene) => scene.results.length === 4));
  assert.ok(matrix.scenes.every((scene) => scene.monotonic));
  assert.ok(matrix.scenes.every((scene) => scene.results.every((result) => result.diagnostics.postCompressionOutOfGamutRatio === 0)));
});

test("six-scene saturated samples keep hue drift bounded at full strength", () => {
  const adjustments: ColorPreviewAdjustments = {
    ...identityAdjustments,
    intensity: 100,
    contrast: 28,
    saturation: 32,
    temperature: 4,
    tint: -2,
    shadowMatch: 57,
    midtoneMatch: 62,
    highlightMatch: 56,
    skinToneProtection: true,
    preserveLuma: true,
    preventOversaturation: true
  };

  for (const fixture of lutStrengthValidationFixtures) {
    for (const input of fixture.samples) {
      if (getOklabChroma(input) < 0.04) {
        continue;
      }
      const output = applyLookToRgb(input, adjustments);
      if (getOklabChroma(output) < 0.02) {
        continue;
      }
      const drift = hueDistanceDegrees(getOklabHueDegrees(input), getOklabHueDegrees(output));
      assert.ok(drift <= 20, JSON.stringify({ sceneId: fixture.sceneId, input, output, drift }));
    }
  }
});

test("POST cubes at 17, 33, and 65 points validate and satisfy interpolation thresholds", async () => {
  const adjustments: ColorPreviewAdjustments = {
    ...identityAdjustments,
    intensity: 50,
    contrast: 22,
    saturation: 20,
    temperature: 8,
    tint: -3,
    shadowMatch: 56,
    midtoneMatch: 60,
    highlightMatch: 55,
    preserveLuma: true,
    preventOversaturation: true
  };

  for (const size of [17, 33, 65] as const) {
    const parameterHash = await createPostParameterHash({ adjustments, lutSize: size });
    const generated = generateCubeLut({ lutName: `POST_Consistency_${size}`, lookName: "Consistency", lutSize: size, adjustments, parameterHash });
    const validation = validateCubeLut(generated.content);
    const parsed = parseCubeLut(generated.content);
    const cubeHash = await createCubeContentHash(generated.content);
    const diagnostics = calculateCubeConsistency(parsed.lut, adjustments, parameterHash, cubeHash);
    const consistencySamples = [0, 0.03, 0.08, 0.18, 0.33, 0.5, 0.66, 0.82, 0.95, 1];
    let worstSample: { readonly input: RgbColor; readonly expected: RgbColor; readonly actual: RgbColor; readonly error: number } | undefined;
    for (const b of consistencySamples) {
      for (const g of consistencySamples) {
        for (const r of consistencySamples) {
          const input = { r, g, b };
          const expected = applyLookToRgb(input, adjustments);
          const actual = evaluateCubeLut(parsed.lut, input);
          const error = Math.max(Math.abs(actual.r - expected.r), Math.abs(actual.g - expected.g), Math.abs(actual.b - expected.b));
          if (worstSample === undefined || error > worstSample.error) {
            worstSample = { input, expected, actual, error };
          }
        }
      }
    }

    assert.equal(validation.isValid, true);
    assert.equal(validation.dataLineCount, size ** 3);
    assert.equal(parsed.lut.data.length, size ** 3);
    assert.equal(diagnostics.previewSource, "final-export-cube");
    assert.equal(diagnostics.passed, true, JSON.stringify({ diagnostics, worstSample }));
  }
});

test("same POST parameters create stable hashes independently of target material", async () => {
  const adjustments = { ...identityAdjustments, intensity: 50, contrast: 12, saturation: 8 };
  const firstParameterHash = await createPostParameterHash({ adjustments, lutSize: 17 });
  const secondParameterHash = await createPostParameterHash({ adjustments, lutSize: 17 });
  const first = generateCubeLut({ lutName: "POST_Stable", lookName: "Stable", lutSize: 17, adjustments, parameterHash: firstParameterHash });
  const second = generateCubeLut({ lutName: "POST_Stable", lookName: "Stable", lutSize: 17, adjustments, parameterHash: secondParameterHash });

  assert.equal(firstParameterHash, secondParameterHash);
  assert.equal(await createCubeContentHash(first.content), await createCubeContentHash(second.content));
});

test("configuration hashing ignores optional undefined object fields deterministically", () => {
  assert.equal(
    stableSerialize({ brand: "Sony", sourceStatus: undefined, gamma: "S-Log3" }),
    stableSerialize({ gamma: "S-Log3", brand: "Sony" })
  );
});

test("changing an applied automatic suggestion changes parameter and cube hashes", async () => {
  const initial = { ...identityAdjustments, intensity: 50, contrast: 8 };
  const suggested = { ...initial, contrast: 22, saturation: 14, temperature: 6 };
  const initialHash = await createPostParameterHash({ adjustments: initial, lutSize: 17 });
  const suggestedHash = await createPostParameterHash({ adjustments: suggested, lutSize: 17 });
  const initialCube = generateCubeLut({ lutName: "POST_Auto", lookName: "Auto", lutSize: 17, adjustments: initial, parameterHash: initialHash });
  const suggestedCube = generateCubeLut({ lutName: "POST_Auto", lookName: "Auto", lutSize: 17, adjustments: suggested, parameterHash: suggestedHash });

  assert.notEqual(initialHash, suggestedHash);
  assert.notEqual(await createCubeContentHash(initialCube.content), await createCubeContentHash(suggestedCube.content));
});

test("sRGB to Rec.709 Gamma 2.4 conversion round-trips for display", () => {
  const input = { r: 0.08, g: 0.42, b: 0.91 };
  const working = inputColorToRec709Gamma24(input, {
    profileId: "srgb-full",
    confidence: "confirmed",
    source: "user-confirmed",
    note: "test"
  });
  assertRgbClose(rec709Gamma24ToDisplaySrgb(working), input, 1e-9);
});

test("Legal Range expands once to Full and round-trips without a second expansion", () => {
  const source = { r: 0.12, g: 0.5, b: 0.88 };
  const encoded = compressSignalRange(source, "legal");
  const expanded = expandSignalRange(encoded, "legal");
  const interpreted = inputColorToRec709Gamma24(encoded, {
    ...defaultDpxInterpretation(),
    profileId: "bt709-g24-legal",
    source: "user-confirmed",
    confidence: "confirmed"
  });

  assertRgbClose(expanded, source, 1e-9);
  assertRgbClose(interpreted, source, 1e-9);
  assert.notDeepEqual(expandSignalRange(interpreted, "legal"), source);
});

test("POST cube declares its Rec.709 Gamma 2.4 Full contract and node order", () => {
  const result = generateCubeLut({ lutName: "POST_Contract", lookName: "Contract", lutSize: 17, adjustments: identityAdjustments });
  assert.match(result.content, /Input Contract: Rec\.709 \/ Gamma 2\.4 \/ Full/);
  assert.match(result.content, /Output Contract: Rec\.709 \/ Gamma 2\.4 \/ Full/);
  assert.match(result.content, /Input Profile ID: bt709-g24-full/);
  assert.match(result.content, /Output Profile ID: bt709-g24-full/);
  assert.match(result.content, /Preview Display Transform: bt709-g24-to-browser-srgb/);
  assert.match(result.content, /Cube Hash: calculated-after-generation/);
  assert.match(result.content, /DaVinci Node Key Output Gain: 1\.000/);
  assert.match(result.content, /Prohibited Input: Unconverted camera Log footage/);
});

test("controlled color profile registry exposes only complete valid contracts", () => {
  assert.equal(colorEncodingProfiles.length, 8);
  assert.equal(new Set(colorEncodingProfiles.map((profile) => profile.id)).size, colorEncodingProfiles.length);
  assert.equal(getColorEncodingProfile("dci-p3-g26-full").status, "experimental");
  assert.equal(getColorEncodingProfile("dci-p3-g26-full").enabledForPostExport, false);
  assert.equal(getColorEncodingProfile("display-p3-srgb-full").transferFunction, "srgb");
  assert.equal(getColorEncodingProfile("unknown-manual").status, "warning-only");
  assert.equal(getColorEncodingProfile("camera-log-unconverted").enabledForPostExport, false);
});

test("sRGB and BT.1886 Gamma 2.4 channel functions round-trip", () => {
  for (const value of [0, 0.001, 0.018, 0.18, 0.5, 0.82, 1]) {
    assert.ok(Math.abs(encodeSrgbChannel(decodeSrgbChannel(value)) - value) <= 1e-9);
    assert.ok(Math.abs(encodeBt1886Gamma24Channel(decodeBt1886Gamma24Channel(value)) - value) <= 1e-9);
  }
});

test("Gamma 2.2 and BT.1886 Gamma 2.4 remain distinct contracts", () => {
  const encoded22 = encodeGamma22Channel(0.18);
  const encoded24 = encodeBt1886Gamma24Channel(0.18);
  assert.ok(Math.abs(encoded22 - encoded24) > 0.01);
  assert.ok(Math.abs(decodeGamma22Channel(encoded22) - 0.18) <= 1e-9);
});

test("unknown input is never silently upgraded to a confirmed profile", () => {
  const interpretation = defaultDpxInterpretation();
  assert.equal(interpretation.profileId, "unknown-manual");
  assert.equal(interpretation.confidence, "unknown");
  assert.equal(getColorEncodingProfile(interpretation.profileId).enabledForPostExport, false);
});

test("input profile changes the interpretation hash", async () => {
  const srgbHash = await createInputInterpretationHash({
    profileId: "srgb-full",
    confidence: "confirmed",
    source: "user-confirmed",
    note: "same note"
  });
  const gamma24Hash = await createInputInterpretationHash({
    profileId: "bt709-g24-full",
    confidence: "confirmed",
    source: "user-confirmed",
    note: "same note"
  });
  assert.notEqual(srgbHash, gamma24Hash);
});

test("input profile changes the preview configuration signature", () => {
  const base = {
    adjustments: identityAdjustments,
    lutSize: 17,
    lutName: "POST_BT709_G24_FULL_Test_17pt_v1",
    lookName: "Test",
    inputColorConfig: toInputColorConfig(defaultCameraProfile),
    referenceKey: "reference",
    targetKey: "target",
    technicalTransformKey: "none",
    referenceInterpretation: {
      profileId: "srgb-full" as const,
      confidence: "confirmed" as const,
      source: "user-confirmed" as const,
      note: "reference"
    }
  };
  const srgbSignature = createPostConfigurationSignature({
    ...base,
    targetInterpretation: {
      profileId: "srgb-full",
      confidence: "confirmed",
      source: "user-confirmed",
      note: "target"
    }
  });
  const gamma24Signature = createPostConfigurationSignature({
    ...base,
    targetInterpretation: {
      profileId: "bt709-g24-full",
      confidence: "confirmed",
      source: "user-confirmed",
      note: "target"
    }
  });
  assert.notEqual(srgbSignature, gamma24Signature);
});

const createGrayRampPixels = (transform: (value: number) => number): Uint8ClampedArray => {
  const output = new Uint8ClampedArray(256 * 4);
  for (let value = 0; value < 256; value += 1) {
    const transformed = Math.round(Math.min(1, Math.max(0, transform(value / 255))) * 255);
    const index = value * 4;
    output[index] = transformed;
    output[index + 1] = transformed;
    output[index + 2] = transformed;
    output[index + 3] = 255;
  }
  return output;
};

test("round-trip comparator reports identity pixels near zero", () => {
  const pixels = createGrayRampPixels((value) => value);
  const result = compareRoundTripPixels({ expected: pixels, actual: pixels, width: 256, height: 1 });
  assert.equal(result.passed, true);
  assert.equal(result.diagnosis, "lut-values-consistent");
  assert.equal(result.rgbMeanAbsoluteError, 0);
});

test("round-trip comparator identifies a Gamma 2.2 versus 2.4 mismatch", () => {
  const expected = createGrayRampPixels((value) => value);
  const actual = createGrayRampPixels((value) => encodeGamma22Channel(decodeBt1886Gamma24Channel(value)));
  const result = compareRoundTripPixels({ expected, actual, width: 256, height: 1 });
  assert.equal(result.passed, false);
  assert.equal(result.diagnosis, "gamma-mismatch-suspected");
});

test("round-trip comparator identifies Full versus Legal range mismatch", () => {
  const expected = createGrayRampPixels((value) => value);
  const actual = createGrayRampPixels((value) => 16 / 255 + value * (219 / 255));
  const result = compareRoundTripPixels({ expected, actual, width: 256, height: 1 });
  assert.equal(result.passed, false);
  assert.equal(result.diagnosis, "range-mismatch-suspected");
});

test("six-scene stress report emits explainable risk conclusions", () => {
  const entries = validationScenes.map((scene) => ({
    scene,
    before: createStatistics(),
    after: createStatistics(
      scene.id === "saturated-red"
        ? { highSaturationRedRatio: 0.05, saturationAverage: 0.5, saturationP95: 0.96 }
        : scene.id === "daylight-high-contrast"
          ? { highlightClipRatio: 0.04, blackClipRatio: 0.03, luminanceAverage: 0.58 }
          : {}
    )
  }));
  const report = createLutStressTestReport("a".repeat(64), entries);

  assert.equal(report.results.length, 6);
  assert.ok(report.overallConclusions.includes("存在红色溢出风险"));
  assert.ok(report.overallConclusions.includes("存在高光风险"));
  assert.ok(report.results.every((result) => result.conclusions.length > 0));
});

test("preview request gate accepts only the latest concurrent generation", () => {
  const gate = new LatestRequestGate();
  const firstRequest = gate.begin();
  const secondRequest = gate.begin();

  assert.equal(gate.isCurrent(firstRequest), false);
  assert.equal(gate.isCurrent(secondRequest), true);
});

test("Canvas preview cleanup revokes only generated Blob URLs", () => {
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  const revokedUrls: string[] = [];
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: (url: string) => revokedUrls.push(url)
  });

  try {
    revokeColorPreviewUrl("blob:preview-before");
    revokeColorPreviewUrl("https://example.com/image.jpg");
    revokeColorPreviewUrl(undefined);
    assert.deepEqual(revokedUrls, ["blob:preview-before"]);
  } finally {
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectUrl
    });
  }
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
