import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = dirname(scriptDirectory);
const temporaryDirectory = join(projectDirectory, ".tmp-style-library-previews");
const outputDirectory = join(projectDirectory, "public", "style-previews");
const reportDirectory = join(projectDirectory, "docs", "reports");
const manifestPath = join(reportDirectory, "S17.1-style-preview-manifest.json");
const validationJsonPath = join(reportDirectory, "S17.1-style-validation-matrix.json");
const validationMarkdownPath = join(reportDirectory, "S17.1-style-validation-matrix.md");
const applicationManifestPath = join(projectDirectory, "src", "data", "stylePreviewManifest.json");
const typescriptCli = join(projectDirectory, "node_modules", "typescript", "bin", "tsc");
const width = 640;
const height = 360;
const scenePreviewWidth = 320;
const scenePreviewHeight = 180;
const channels = 3;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const mix = (left, right, ratio) => left + (right - left) * ratio;

const compileStyleRuntime = () => {
  if (!existsSync(typescriptCli)) {
    throw new Error(`TypeScript CLI not found: ${typescriptCli}`);
  }
  rmSync(temporaryDirectory, { recursive: true, force: true });
  mkdirSync(temporaryDirectory, { recursive: true });
  const sourceFiles = [
    join(projectDirectory, "src", "data", "styles.ts"),
    join(projectDirectory, "src", "data", "lutStrengthFixtures.ts"),
    join(projectDirectory, "src", "utils", "cubeExport.ts"),
    join(projectDirectory, "src", "utils", "cubeParser.ts"),
    join(projectDirectory, "src", "utils", "cubeEvaluator.ts"),
    join(projectDirectory, "src", "utils", "lutStrengthDiagnostics.ts"),
    join(projectDirectory, "src", "utils", "lutStrengthValidation.ts")
  ];
  const args = [
    typescriptCli,
    "--ignoreConfig",
    "--module", "commonjs",
    "--moduleResolution", "node",
    "--ignoreDeprecations", "6.0",
    "--target", "ES2021",
    "--lib", "ES2021,DOM",
    "--esModuleInterop",
    "--skipLibCheck",
    "--strict",
    "--resolveJsonModule",
    "--noEmitOnError",
    "--outDir", temporaryDirectory,
    "--rootDir", join(projectDirectory, "src"),
    ...sourceFiles
  ];
  const result = spawnSync(process.execPath, args, { cwd: projectDirectory, encoding: "utf8" });
  if (result.error !== undefined) {
    throw new Error(`Unable to start TypeScript compiler: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter((entry) => entry.trim().length > 0).join("\n");
    throw new Error(`Style preview runtime compilation failed with exit code ${result.status ?? "unknown"}:\n${details}`);
  }
  writeFileSync(join(temporaryDirectory, "package.json"), "{\"type\":\"commonjs\"}\n", "utf8");
};

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

const encodePng = (pixels, imageWidth, imageHeight) => {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(imageWidth, 0);
  ihdr.writeUInt32BE(imageHeight, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const gamma = Buffer.alloc(4);
  gamma.writeUInt32BE(41_667, 0);
  const contractText = Buffer.from("ColorContract\0BT.709 Gamma 2.4 Full Range", "latin1");
  const raw = Buffer.alloc((imageWidth * channels + 1) * imageHeight);
  for (let row = 0; row < imageHeight; row += 1) {
    const rowOffset = row * (imageWidth * channels + 1);
    raw[rowOffset] = 0;
    pixels.copy(raw, rowOffset + 1, row * imageWidth * channels, (row + 1) * imageWidth * channels);
  }
  return Buffer.concat([
    signature,
    createChunk("IHDR", ihdr),
    createChunk("gAMA", gamma),
    createChunk("tEXt", contractText),
    createChunk("IDAT", deflateSync(raw, { level: 9 })),
    createChunk("IEND", Buffer.alloc(0))
  ]);
};

const getBaseColor = (x, y) => {
  const normalizedX = x / Math.max(1, width - 1);
  const normalizedY = y / Math.max(1, height - 1);
  const skyRatio = clamp01(normalizedY / 0.62);
  let r = mix(0.12, 0.54, skyRatio);
  let g = mix(0.35, 0.66, skyRatio);
  let b = mix(0.72, 0.78, skyRatio);

  if (normalizedY > 0.58) {
    const groundRatio = (normalizedY - 0.58) / 0.42;
    r = mix(0.12, 0.28, groundRatio);
    g = mix(0.36, 0.19, groundRatio);
    b = mix(0.16, 0.11, groundRatio);
  }

  const faceX = (normalizedX - 0.36) / 0.12;
  const faceY = (normalizedY - 0.49) / 0.25;
  if (faceX * faceX + faceY * faceY <= 1) {
    const faceShade = clamp01(0.92 - Math.abs(faceX) * 0.18 - Math.max(0, faceY) * 0.12);
    r = 0.78 * faceShade;
    g = 0.53 * faceShade;
    b = 0.39 * faceShade;
  }

  const redX = normalizedX - 0.76;
  const redY = normalizedY - 0.64;
  if (redX * redX + redY * redY <= 0.0075) {
    const redHighlight = clamp01(1 - Math.sqrt(redX * redX + redY * redY) / 0.087);
    r = mix(0.72, 1, redHighlight);
    g = mix(0.025, 0.16, redHighlight);
    b = mix(0.018, 0.08, redHighlight);
  }

  if (normalizedY > 0.88) {
    const patchIndex = Math.min(7, Math.floor(normalizedX * 8));
    const patches = [
      [0.02, 0.02, 0.02], [0.08, 0.08, 0.08], [0.18, 0.18, 0.18], [0.35, 0.35, 0.35],
      [0.52, 0.52, 0.52], [0.68, 0.68, 0.68], [0.84, 0.84, 0.84], [0.98, 0.98, 0.98]
    ];
    [r, g, b] = patches[patchIndex];
  }

  const vignette = 1 - 0.24 * clamp01(((normalizedX - 0.5) ** 2 + (normalizedY - 0.5) ** 2) / 0.5);
  return { r: clamp01(r * vignette), g: clamp01(g * vignette), b: clamp01(b * vignette) };
};

const renderStylePreview = (lut, evaluateCubeLut) => {
  const pixels = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const output = evaluateCubeLut(lut, getBaseColor(x, y));
      const offset = (y * width + x) * channels;
      pixels[offset] = Math.round(clamp01(output.r) * 255);
      pixels[offset + 1] = Math.round(clamp01(output.g) * 255);
      pixels[offset + 2] = Math.round(clamp01(output.b) * 255);
    }
  }
  return encodePng(pixels, width, height);
};

const renderScenePreview = (lut, evaluateCubeLut, fixture) => {
  if (!Array.isArray(fixture.samples) || fixture.samples.length !== 8) {
    throw new Error(`Scene fixture ${fixture.sceneId} must contain exactly eight RGB samples.`);
  }
  const pixels = Buffer.alloc(scenePreviewWidth * scenePreviewHeight * channels);
  for (let y = 0; y < scenePreviewHeight; y += 1) {
    const normalizedY = y / Math.max(1, scenePreviewHeight - 1);
    const row = Math.min(1, Math.floor(normalizedY * 2));
    for (let x = 0; x < scenePreviewWidth; x += 1) {
      const normalizedX = x / Math.max(1, scenePreviewWidth - 1);
      const columnPosition = normalizedX * 4;
      const leftColumn = Math.min(3, Math.floor(columnPosition));
      const rightColumn = Math.min(3, leftColumn + 1);
      const blendRatio = rightColumn === leftColumn ? 0 : columnPosition - leftColumn;
      const left = fixture.samples[row * 4 + leftColumn];
      const right = fixture.samples[row * 4 + rightColumn];
      const vignette = 1 - 0.08 * clamp01(((normalizedX - 0.5) ** 2 + (normalizedY - 0.5) ** 2) / 0.5);
      const input = {
        r: clamp01(mix(left.r, right.r, blendRatio) * vignette),
        g: clamp01(mix(left.g, right.g, blendRatio) * vignette),
        b: clamp01(mix(left.b, right.b, blendRatio) * vignette)
      };
      const output = evaluateCubeLut(lut, input);
      const offset = (y * scenePreviewWidth + x) * channels;
      pixels[offset] = Math.round(clamp01(output.r) * 255);
      pixels[offset + 1] = Math.round(clamp01(output.g) * 255);
      pixels[offset + 2] = Math.round(clamp01(output.b) * 255);
    }
  }
  return encodePng(pixels, scenePreviewWidth, scenePreviewHeight);
};

const main = () => {
  compileStyleRuntime();
  const requireFromScript = createRequire(import.meta.url);
  const { lutStyles } = requireFromScript(join(temporaryDirectory, "data", "styles.js"));
  const { generateCubeLut } = requireFromScript(join(temporaryDirectory, "utils", "cubeExport.js"));
  const { parseCubeLut } = requireFromScript(join(temporaryDirectory, "utils", "cubeParser.js"));
  const { evaluateCubeLut } = requireFromScript(join(temporaryDirectory, "utils", "cubeEvaluator.js"));
  const { lutStrengthValidationFixtures } = requireFromScript(join(temporaryDirectory, "data", "lutStrengthFixtures.js"));
  const { createLutStrengthValidationMatrix } = requireFromScript(join(temporaryDirectory, "utils", "lutStrengthValidation.js"));
  if (dirname(outputDirectory) !== join(projectDirectory, "public")) {
    throw new Error(`Refusing to replace unexpected preview directory: ${outputDirectory}`);
  }
  rmSync(outputDirectory, { recursive: true, force: true });
  mkdirSync(outputDirectory, { recursive: true });
  mkdirSync(reportDirectory, { recursive: true });
  const entries = [];
  const sceneEntries = [];
  const styleValidationEntries = [];

  for (const style of lutStyles) {
    const matrix = createLutStrengthValidationMatrix(lutStrengthValidationFixtures, style.adjustments);
    const resultEntries = matrix.scenes.flatMap((scene) => scene.results.map((result) => ({
      sceneId: scene.sceneId,
      sceneLabel: scene.label,
      strength: result.strength,
      averageRgbDistance: result.averageRgbDistance,
      maximumRgbDistance: result.maximumRgbDistance,
      postCompressionOutOfGamutRatio: result.diagnostics.postCompressionOutOfGamutRatio,
      clippedChannelRatio: result.diagnostics.clippedChannelRatio,
      neutralAxisError: result.diagnostics.neutralAxisError,
      hueDriftP95: result.diagnostics.hueDriftP95,
      skinHueError: result.diagnostics.skinHueError,
      maximumChromaReduction: result.diagnostics.maximumChromaReduction
    })));
    const maximumHueDriftP95 = Math.max(...resultEntries.map((entry) => entry.hueDriftP95));
    const maximumPostCompressionOutOfGamutRatio = Math.max(...resultEntries.map((entry) => entry.postCompressionOutOfGamutRatio));
    const maximumClippedChannelRatio = Math.max(...resultEntries.map((entry) => entry.clippedChannelRatio));
    const passed = matrix.allScenesMonotonic
      && maximumHueDriftP95 <= 25
      && maximumPostCompressionOutOfGamutRatio === 0
      && maximumClippedChannelRatio <= 0.1;
    if (!passed) {
      throw new Error(`Style validation failed for ${style.id}: ${JSON.stringify({ maximumHueDriftP95, maximumPostCompressionOutOfGamutRatio, maximumClippedChannelRatio, allScenesMonotonic: matrix.allScenesMonotonic })}`);
    }
    styleValidationEntries.push({
      styleId: style.id,
      styleName: style.name,
      version: style.version,
      provenanceType: style.provenance.type,
      riskLevel: style.riskProfile.level,
      allScenesMonotonic: matrix.allScenesMonotonic,
      maximumHueDriftP95,
      maximumPostCompressionOutOfGamutRatio,
      maximumClippedChannelRatio,
      passed,
      results: resultEntries
    });
    for (const strength of style.compatibility.strengths) {
      const adjustments = { ...style.adjustments, intensity: strength };
      const parameterJson = JSON.stringify(adjustments);
      const parameterHash = sha256(parameterJson);
      const cube = generateCubeLut({
        lutName: `POST_${style.id}_${strength}pct_17pt_preview`,
        lookName: style.name,
        lutSize: 17,
        adjustments,
        parameterHash
      });
      const parsed = parseCubeLut(cube.content);
      const png = renderStylePreview(parsed.lut, evaluateCubeLut);
      const fileName = `${style.id}-${strength}.png`;
      const outputPath = join(outputDirectory, fileName);
      writeFileSync(outputPath, png);
      entries.push({
        styleId: style.id,
        version: style.version,
        strength,
        parameterHash,
        cubeHash: sha256(cube.content),
        cubeSize: 17,
        cubeDataLineCount: cube.dataLineCount,
        previewHash: sha256(png),
        previewPath: `public/style-previews/${fileName}`,
        previewWidth: width,
        previewHeight: height,
        inputContract: style.compatibility.inputContract,
        outputContract: style.compatibility.outputContract,
        generatedFromFinalCube: true
      });
    }

    const recommendedAdjustments = { ...style.adjustments, intensity: style.recommendedIntensity };
    const recommendedParameterHash = sha256(JSON.stringify(recommendedAdjustments));
    const recommendedCube = generateCubeLut({
      lutName: `POST_${style.id}_${style.recommendedIntensity}pct_17pt_scene_preview`,
      lookName: style.name,
      lutSize: 17,
      adjustments: recommendedAdjustments,
      parameterHash: recommendedParameterHash
    });
    const recommendedParsed = parseCubeLut(recommendedCube.content);
    for (const fixture of lutStrengthValidationFixtures) {
      const png = renderScenePreview(recommendedParsed.lut, evaluateCubeLut, fixture);
      const fileName = `${style.id}-scene-${fixture.sceneId}-${style.recommendedIntensity}.png`;
      const outputPath = join(outputDirectory, fileName);
      writeFileSync(outputPath, png);
      sceneEntries.push({
        styleId: style.id,
        styleName: style.name,
        version: style.version,
        sceneId: fixture.sceneId,
        sceneLabel: fixture.label,
        strength: style.recommendedIntensity,
        parameterHash: recommendedParameterHash,
        cubeHash: sha256(recommendedCube.content),
        cubeSize: 17,
        cubeDataLineCount: recommendedCube.dataLineCount,
        previewHash: sha256(png),
        previewPath: `public/style-previews/${fileName}`,
        previewWidth: scenePreviewWidth,
        previewHeight: scenePreviewHeight,
        inputContract: style.compatibility.inputContract,
        outputContract: style.compatibility.outputContract,
        source: fixture.source,
        generatedFromFinalCube: true
      });
    }
  }

  const manifest = {
    task: "S17.1-STYLE-LIBRARY",
    generatedAt: new Date().toISOString(),
    generator: "scripts/generate-style-library-previews.mjs",
    sourceMedia: "deterministic-procedural-calibration-and-six-scene-stress-fixtures",
    externalAssetsEmbedded: false,
    styleCount: lutStyles.length,
    previewCount: entries.length + sceneEntries.length,
    strengthPreviewCount: entries.length,
    scenePreviewCount: sceneEntries.length,
    entries,
    sceneEntries
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  writeFileSync(applicationManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const validationReport = {
    task: "S17.1-STYLE-LIBRARY",
    schemaVersion: 1,
    generatedAt: manifest.generatedAt,
    sampleSource: "procedural-six-scene-stress-fixtures-not-user-media",
    acceptance: {
      everySceneStrengthIsStrictlyMonotonic: true,
      maximumHueDriftP95Degrees: 25,
      maximumPostCompressionOutOfGamutRatio: 0,
      maximumClippedChannelRatio: 0.1
    },
    styleCount: styleValidationEntries.length,
    passedStyleCount: styleValidationEntries.filter((entry) => entry.passed).length,
    allStylesPassed: styleValidationEntries.every((entry) => entry.passed),
    entries: styleValidationEntries
  };
  const markdownRows = styleValidationEntries.map((entry) =>
    `| ${entry.styleName} | ${entry.provenanceType} | ${entry.riskLevel} | ${entry.allScenesMonotonic ? "pass" : "fail"} | ${entry.maximumHueDriftP95.toFixed(4)} | ${entry.maximumPostCompressionOutOfGamutRatio.toFixed(6)} | ${entry.maximumClippedChannelRatio.toFixed(6)} | ${entry.passed ? "pass" : "fail"} |`
  );
  const validationMarkdown = [
    "# S17.1 Style Validation Matrix",
    "",
    `Generated: ${validationReport.generatedAt}`,
    "",
    "All results use deterministic procedural stress fixtures. They are regression evidence, not a substitute for licensed real-media review.",
    "",
    "| Style | Provenance | Risk | Monotonic | Max hue drift P95 | Post OOG | Clipped channels | Result |",
    "| --- | --- | --- | --- | ---: | ---: | ---: | --- |",
    ...markdownRows,
    "",
    `Passed: ${validationReport.passedStyleCount}/${validationReport.styleCount}`,
    ""
  ].join("\n");
  writeFileSync(validationJsonPath, `${JSON.stringify(validationReport, null, 2)}\n`, "utf8");
  writeFileSync(validationMarkdownPath, validationMarkdown, "utf8");
  process.stdout.write(`${JSON.stringify({ manifestPath, applicationManifestPath, validationJsonPath, validationMarkdownPath, outputDirectory, styleCount: lutStyles.length, strengthPreviewCount: entries.length, scenePreviewCount: sceneEntries.length, previewCount: entries.length + sceneEntries.length, allStylesPassed: validationReport.allStylesPassed }, null, 2)}\n`);
};

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown style preview generation error";
  console.error(`Style preview generation failed: ${message}`);
  process.exitCode = 1;
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
