import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = dirname(scriptDirectory);
const temporaryDirectory = join(projectDirectory, ".tmp-s16-4-2-roundtrip");
const typescriptCli = join(projectDirectory, "node_modules", "typescript", "bin", "tsc");
const defaultAssetDirectory = join(projectDirectory, "local-test-assets", "S16.4.2");

const defaults = {
  pre: join(defaultAssetDirectory, "davinci", "A_PRE_BT709_G24_FULL.png"),
  post: join(defaultAssetDirectory, "davinci", "A_POST_DAVINCI.png"),
  cube: join(defaultAssetDirectory, "cube", "POST_BT709_G24_FULL_S16_4_2_AUTOTEST_33pt_v1.cube"),
  profile: "bt709-g24-full",
  json: join(defaultAssetDirectory, "reports", "test-a-result.json"),
  markdown: join(defaultAssetDirectory, "reports", "test-a-result.md"),
  testId: "A-calibration-file-cube-round-trip",
  maxLongEdge: 1200
};

const parseArguments = (values) => {
  const options = { ...defaults };
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    const value = values[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for command-line option ${key}.`);
    }
    if (key === "--pre" || key === "--post" || key === "--cube" || key === "--json" || key === "--markdown") {
      options[key.slice(2)] = resolve(projectDirectory, value);
    } else if (key === "--profile") {
      options.profile = value;
    } else if (key === "--test-id") {
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/.test(value)) {
        throw new Error("--test-id must contain 3 to 128 letters, numbers, periods, underscores, or hyphens.");
      }
      options.testId = value;
    } else if (key === "--max-long-edge") {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isInteger(parsed) || parsed < 256 || parsed > 4096) {
        throw new Error("--max-long-edge must be an integer from 256 through 4096.");
      }
      options.maxLongEdge = parsed;
    } else {
      throw new Error(`Unsupported command-line option ${key}.`);
    }
    index += 1;
  }
  return options;
};

const runCompiler = () => {
  const sourceFiles = [
    join(projectDirectory, "src", "utils", "roundTripValidation.ts"),
    join(projectDirectory, "src", "utils", "cubeParser.ts"),
    join(projectDirectory, "src", "utils", "cubeValidate.ts")
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
    "--noEmitOnError",
    "--outDir", temporaryDirectory,
    "--rootDir", join(projectDirectory, "src"),
    ...sourceFiles
  ];
  const result = spawnSync(process.execPath, args, { cwd: projectDirectory, encoding: "utf8" });
  if (result.error !== undefined) {
    throw new Error(`Unable to start the TypeScript compiler: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter((entry) => entry.trim().length > 0).join("\n");
    throw new Error(`Round-trip dependencies failed to compile with exit code ${result.status ?? "unknown"}:\n${details}`);
  }
};

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const paethPredictor = (left, above, upperLeft) => {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) {
    return left;
  }
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
};

const readPngFrame = (path) => {
  const file = readFileSync(path);
  if (file.length < PNG_SIGNATURE.length || !file.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error(`Not a PNG file: ${path}`);
  }

  let offset = PNG_SIGNATURE.length;
  let header;
  let gamma;
  let hasSrgbChunk = false;
  const idatParts = [];
  while (offset + 12 <= file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > file.length) {
      throw new Error(`PNG chunk ${type} exceeds the file boundary in ${path}.`);
    }
    const data = file.subarray(dataStart, dataEnd);
    if (type === "IHDR") {
      if (length !== 13) {
        throw new Error(`PNG IHDR length is ${length}, expected 13 in ${path}.`);
      }
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12]
      };
    } else if (type === "IDAT") {
      idatParts.push(data);
    } else if (type === "gAMA" && length === 4) {
      gamma = data.readUInt32BE(0) / 100000;
    } else if (type === "sRGB") {
      hasSrgbChunk = true;
    } else if (type === "IEND") {
      break;
    }
    offset = dataEnd + 4;
  }

  if (header === undefined) {
    throw new Error(`PNG IHDR is missing in ${path}.`);
  }
  if (header.width <= 0 || header.height <= 0) {
    throw new Error(`PNG dimensions are invalid in ${path}.`);
  }
  if (header.compression !== 0 || header.filter !== 0 || header.interlace !== 0) {
    throw new Error(`PNG uses unsupported compression, filter, or interlace mode in ${path}.`);
  }
  if (header.bitDepth !== 8 && header.bitDepth !== 16) {
    throw new Error(`PNG bit depth ${header.bitDepth} is unsupported in ${path}; expected 8 or 16.`);
  }
  const channelCount = header.colorType === 2 ? 3 : header.colorType === 6 ? 4 : 0;
  if (channelCount === 0) {
    throw new Error(`PNG color type ${header.colorType} is unsupported in ${path}; expected RGB or RGBA.`);
  }
  if (idatParts.length === 0) {
    throw new Error(`PNG IDAT data is missing in ${path}.`);
  }

  const bytesPerSample = header.bitDepth / 8;
  const bytesPerPixel = channelCount * bytesPerSample;
  const rowBytes = header.width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idatParts));
  const expectedInflatedLength = (rowBytes + 1) * header.height;
  if (inflated.length !== expectedInflatedLength) {
    throw new Error(`PNG inflated length is ${inflated.length}, expected ${expectedInflatedLength} in ${path}.`);
  }

  const reconstructed = Buffer.alloc(rowBytes * header.height);
  for (let y = 0; y < header.height; y += 1) {
    const sourceRow = y * (rowBytes + 1);
    const destinationRow = y * rowBytes;
    const filterType = inflated[sourceRow];
    if (filterType > 4) {
      throw new Error(`PNG filter ${filterType} is unsupported at row ${y} in ${path}.`);
    }
    for (let x = 0; x < rowBytes; x += 1) {
      const encoded = inflated[sourceRow + 1 + x];
      const left = x >= bytesPerPixel ? reconstructed[destinationRow + x - bytesPerPixel] : 0;
      const above = y > 0 ? reconstructed[destinationRow - rowBytes + x] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel ? reconstructed[destinationRow - rowBytes + x - bytesPerPixel] : 0;
      let predictor = 0;
      if (filterType === 1) predictor = left;
      else if (filterType === 2) predictor = above;
      else if (filterType === 3) predictor = Math.floor((left + above) / 2);
      else if (filterType === 4) predictor = paethPredictor(left, above, upperLeft);
      reconstructed[destinationRow + x] = (encoded + predictor) & 0xff;
    }
  }

  const rgba = new Uint8ClampedArray(header.width * header.height * 4);
  const readSample = (byteOffset) => bytesPerSample === 1
    ? reconstructed[byteOffset]
    : Math.round(reconstructed.readUInt16BE(byteOffset) / 257);
  for (let sourceOffset = 0, destinationOffset = 0; sourceOffset < reconstructed.length; sourceOffset += bytesPerPixel, destinationOffset += 4) {
    rgba[destinationOffset] = readSample(sourceOffset);
    rgba[destinationOffset + 1] = readSample(sourceOffset + bytesPerSample);
    rgba[destinationOffset + 2] = readSample(sourceOffset + bytesPerSample * 2);
    rgba[destinationOffset + 3] = channelCount === 4 ? readSample(sourceOffset + bytesPerSample * 3) : 255;
  }

  return {
    width: header.width,
    height: header.height,
    data: rgba,
    metadata: { ...header, gamma: gamma ?? null, hasSrgbChunk }
  };
};

const resizeNearest = (frame, maxLongEdge) => {
  const longEdge = Math.max(frame.width, frame.height);
  if (longEdge <= maxLongEdge) {
    return frame;
  }
  const scale = maxLongEdge / longEdge;
  const width = Math.max(1, Math.round(frame.width * scale));
  const height = Math.max(1, Math.round(frame.height * scale));
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(frame.height - 1, Math.floor((y / height) * frame.height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(frame.width - 1, Math.floor((x / width) * frame.width));
      const sourceOffset = (sourceY * frame.width + sourceX) * 4;
      const destinationOffset = (y * width + x) * 4;
      data[destinationOffset] = frame.data[sourceOffset];
      data[destinationOffset + 1] = frame.data[sourceOffset + 1];
      data[destinationOffset + 2] = frame.data[sourceOffset + 2];
      data[destinationOffset + 3] = frame.data[sourceOffset + 3];
    }
  }
  return { width, height, data, metadata: frame.metadata };
};

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

const formatNumber = (value) => value === undefined ? "n/a" : value.toFixed(8);

const createMarkdown = (report) => {
  const comparison = report.metrics;
  return [
    "# S16.4.2 DaVinci Round-Trip Test A",
    "",
    `- Result: **${report.passed ? "PASS" : "FAIL"}**`,
    `- Diagnostic: \`${report.diagnostic.verdict}\``,
    `- Category: \`${report.diagnostic.category}\``,
    `- Website algorithm bug: \`${report.diagnostic.isWebsiteAlgorithmBug}\``,
    `- Profile: \`${report.profile}\``,
    `- Same dimensions: \`${report.sameDimensions}\` (${report.sourceDimensions.width}x${report.sourceDimensions.height})`,
    `- Same-frame assessment: \`${report.sameFrame.status}\``,
    `- Cube SHA-256: \`${report.files.cube.sha256}\``,
    "",
    "## Metrics",
    "",
    `- RGB MAE: ${formatNumber(comparison?.rgbMeanAbsoluteError)}`,
    `- Linear MAE: ${formatNumber(comparison?.linearLightMeanAbsoluteError)}`,
    `- P95: ${formatNumber(comparison?.p95Error)}`,
    `- P99: ${formatNumber(comparison?.p99Error)}`,
    `- P99.9: ${formatNumber(comparison?.p999Error)}`,
    `- Max: ${formatNumber(comparison?.maximumError)}`,
    `- Channel samples: ${comparison?.channelSampleCount ?? "n/a"}`,
    `- Channels above 0.025: ${comparison?.channelErrorAbove025Count ?? "n/a"}`,
    `- Channels above 0.04: ${comparison?.channelErrorAbove04Count ?? "n/a"}`,
    `- Channels above 0.08: ${comparison?.channelErrorAbove08Count ?? "n/a"}`,
    `- Neutral error: ${formatNumber(comparison?.neutralGrayError)}`,
    `- Luminance error: ${formatNumber(comparison?.luminanceError)}`,
    `- Saturation error: ${formatNumber(comparison?.saturationError)}`,
    `- Shadow error: ${formatNumber(comparison?.darkRegionError)}`,
    `- Midtone error: ${formatNumber(comparison?.midtoneRegionError)}`,
    `- Highlight error: ${formatNumber(comparison?.highlightRegionError)}`,
    "",
    "## Diagnosis",
    "",
    report.diagnostic.chineseConclusion,
    "",
    "## Evidence",
    "",
    `- PRE: \`${report.files.pre.path}\``,
    `- POST: \`${report.files.post.path}\``,
    `- Cube: \`${report.files.cube.path}\``,
    `- Sampled dimensions: ${report.sampledDimensions.width}x${report.sampledDimensions.height}`,
    ""
  ].join("\n");
};

const main = () => {
  const options = parseArguments(process.argv.slice(2));
  if (options.profile !== "bt709-g24-full") {
    throw new Error(`This calibration script requires profile bt709-g24-full, received ${options.profile}.`);
  }
  for (const [label, path] of [["PRE", options.pre], ["POST", options.post], ["Cube", options.cube]]) {
    if (!existsSync(path)) {
      throw new Error(`${label} input does not exist: ${path}`);
    }
  }
  if (!existsSync(typescriptCli)) {
    throw new Error(`TypeScript CLI does not exist: ${typescriptCli}`);
  }

  rmSync(temporaryDirectory, { recursive: true, force: true });
  mkdirSync(temporaryDirectory, { recursive: true });
  mkdirSync(dirname(options.json), { recursive: true });
  mkdirSync(dirname(options.markdown), { recursive: true });
  runCompiler();
  writeFileSync(join(temporaryDirectory, "package.json"), "{\"type\":\"commonjs\"}\n", "utf8");

  const requireFromScript = createRequire(import.meta.url);
  const { parseCubeLut } = requireFromScript(join(temporaryDirectory, "utils", "cubeParser.js"));
  const { validateCubeLut } = requireFromScript(join(temporaryDirectory, "utils", "cubeValidate.js"));
  const { assessRoundTripSameFrame, validateRoundTripFrames } = requireFromScript(
    join(temporaryDirectory, "utils", "roundTripValidation.js")
  );

  const preFile = readFileSync(options.pre);
  const postFile = readFileSync(options.post);
  const cubeFile = readFileSync(options.cube);
  const cubeContent = cubeFile.toString("utf8");
  const cubeValidation = validateCubeLut(cubeContent);
  if (!cubeValidation.isValid) {
    throw new Error(`Cube validation failed: ${cubeValidation.errors.join(" ")}`);
  }
  const parsedCube = parseCubeLut(cubeContent);
  const preDecoded = readPngFrame(options.pre);
  const postDecoded = readPngFrame(options.post);
  const sameDimensions = preDecoded.width === postDecoded.width && preDecoded.height === postDecoded.height;
  if (!sameDimensions) {
    throw new Error(`PRE and POST dimensions differ: ${preDecoded.width}x${preDecoded.height} versus ${postDecoded.width}x${postDecoded.height}.`);
  }
  const pre = resizeNearest(preDecoded, options.maxLongEdge);
  const post = resizeNearest(postDecoded, options.maxLongEdge);
  const sameFrame = assessRoundTripSameFrame(pre, post);
  const validation = validateRoundTripFrames({
    pre,
    post,
    cube: parsedCube.lut,
    cubeMatchesCurrentWorkspace: "matched",
    sameFrameAssessment: sameFrame
  });
  const metrics = validation.preToPost?.comparison;
  const passed = validation.diagnostic.verdict === "validated" && metrics?.passed === true;
  const report = {
    task: "S16.4.2-CU-FOCUS-RECOVERY",
    test: options.testId,
    generatedAt: new Date().toISOString(),
    passed,
    profile: options.profile,
    sameDimensions,
    sourceDimensions: { width: preDecoded.width, height: preDecoded.height },
    sampledDimensions: { width: pre.width, height: pre.height },
    sameFrame: validation.sameFrame,
    metrics: metrics ?? null,
    reverseMetrics: validation.postToPre?.comparison ?? null,
    doubleLutMetrics: validation.doubleLutComparison ?? null,
    diagnostic: validation.diagnostic,
    files: {
      pre: { path: resolve(options.pre), sha256: sha256(preFile), png: preDecoded.metadata },
      post: { path: resolve(options.post), sha256: sha256(postFile), png: postDecoded.metadata },
      cube: {
        path: resolve(options.cube),
        sha256: sha256(cubeFile),
        title: parsedCube.lut.title,
        lutSize: parsedCube.lut.size,
        dataLineCount: parsedCube.lut.data.length,
        domainMin: parsedCube.lut.domainMin,
        domainMax: parsedCube.lut.domainMax,
        validation: cubeValidation
      }
    }
  };
  writeFileSync(options.json, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(options.markdown, createMarkdown(report), "utf8");
  process.stdout.write(`${JSON.stringify({ json: resolve(options.json), markdown: resolve(options.markdown), ...report }, null, 2)}\n`);
  if (!passed) {
    process.exitCode = 2;
  }
};

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown round-trip file validation failure.";
  console.error(message);
  process.exitCode = 1;
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
