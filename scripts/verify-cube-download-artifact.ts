import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { lutStyles } from "../src/data/styles";
import { preparePostLut } from "../src/services/lutRenderService";
import { createConfirmedInterpretation } from "../src/utils/colorSpace";
import { buildCubeDownloadArtifact } from "../src/utils/cubeDownload";
import { parseCubeLut } from "../src/utils/cubeParser";
import { validateCubeLut } from "../src/utils/cubeValidate";
import { createCubeContentHash } from "../src/utils/lutConsistency";
import { defaultLutParameters } from "../src/utils/lutMock";
import { applyLutStyleToWorkspace } from "../src/utils/styleSelection";

interface VerifiedArtifactRecord {
  readonly styleId: string;
  readonly filename: string;
  readonly path: string;
  readonly byteLength: number;
  readonly parameterHash: string;
  readonly cubeHash: string;
  readonly diskSha256: string;
  readonly lutSize: number;
  readonly dataLineCount: number;
  readonly parserPassed: boolean;
  readonly validatorPassed: boolean;
}

const outputDirectory = resolve("local-test-assets", "S18.0", "download-verification");
const styleIds = ["print-2383-inspired", "natural-skin"] as const;

const verifyStyleArtifact = async (styleId: (typeof styleIds)[number]): Promise<VerifiedArtifactRecord> => {
  const style = lutStyles.find((candidate) => candidate.id === styleId);
  if (style === undefined) {
    throw new Error(`未找到风格：${styleId}`);
  }

  const application = applyLutStyleToWorkspace(style, 50);
  const prepared = await preparePostLut({
    lutName: `POST_BT709_G24_FULL_${style.englishName.replace(/\s+/g, "_")}_33pt_v1`,
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
    targetColorInterpretation: createConfirmedInterpretation("bt709-g24-full", "S18.0 Artifact CLI verification"),
    referenceColorInterpretation: createConfirmedInterpretation("bt709-g24-full", "S18.0 Artifact CLI verification")
  });
  const artifact = await buildCubeDownloadArtifact(prepared);
  const outputPath = resolve(outputDirectory, artifact.filename);
  await writeFile(outputPath, artifact.text, "utf8");

  const diskText = await readFile(outputPath, "utf8");
  const validation = validateCubeLut(diskText);
  const parsed = parseCubeLut(diskText);
  const diskSha256 = await createCubeContentHash(diskText);

  if (!validation.isValid || parsed.lut.data.length !== 35_937 || diskSha256 !== artifact.sha256) {
    throw new Error(`磁盘 Artifact 验证失败：${styleId}`);
  }

  return {
    styleId,
    filename: artifact.filename,
    path: outputPath,
    byteLength: artifact.byteLength,
    parameterHash: artifact.parameterHash,
    cubeHash: artifact.cubeHash,
    diskSha256,
    lutSize: artifact.lutSize,
    dataLineCount: parsed.lut.data.length,
    parserPassed: true,
    validatorPassed: true
  };
};

const run = async (): Promise<void> => {
  try {
    await mkdir(outputDirectory, { recursive: true });
    const records: VerifiedArtifactRecord[] = [];
    for (const styleId of styleIds) {
      records.push(await verifyStyleArtifact(styleId));
    }

    if (records[0]?.cubeHash === records[1]?.cubeHash) {
      throw new Error("不同风格生成了相同 Cube Hash。");
    }

    const report = {
      artifactVerified: true,
      browserDownloadRequested: true,
      browserEventCaptured: false,
      osFileLandingVerified: false,
      blockingCoreDevelopment: false,
      records
    };
    await writeFile(resolve(outputDirectory, "artifact-verification.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知 Artifact CLI 验证错误";
    console.error(`下载 Artifact CLI 验证失败：${message}`);
    process.exitCode = 1;
  }
};

void run();
