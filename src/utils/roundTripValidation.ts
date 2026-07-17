import type {
  ParsedCubeLut,
  RoundTripComparisonResult,
  RoundTripDiagnostic,
  RoundTripPixelFrame,
  RoundTripSameFrameAssessment,
  RoundTripValidationInput,
  RoundTripValidationResult
} from "../types";
import { evaluateCubeLut } from "./cubeEvaluator";
import { compareRoundTripPixels } from "./roundTripComparison";

const SAME_FRAME_MAX_EDGE_MAE = 0.18;
const ROUND_TRIP_MAX_EDGE_DIMENSION = 192;

const clampByte = (value: number): number => Math.min(255, Math.max(0, Math.round(value)));

const getLuma = (data: Uint8ClampedArray, offset: number): number => {
  return (0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2]) / 255;
};

const getScaledCoordinate = (destinationIndex: number, destinationSize: number, sourceSize: number): number => {
  return Math.min(sourceSize - 1, Math.floor((destinationIndex / destinationSize) * sourceSize));
};

const calculateEdgeMap = (frame: RoundTripPixelFrame): { readonly width: number; readonly height: number; readonly data: Float32Array } => {
  const scale = Math.min(1, ROUND_TRIP_MAX_EDGE_DIMENSION / Math.max(frame.width, frame.height));
  const width = Math.max(2, Math.round(frame.width * scale));
  const height = Math.max(2, Math.round(frame.height * scale));
  const luma = new Float32Array(width * height);
  const edges = new Float32Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceX = getScaledCoordinate(x, width, frame.width);
      const sourceY = getScaledCoordinate(y, height, frame.height);
      luma[y * width + x] = getLuma(frame.data, (sourceY * frame.width + sourceX) * 4);
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const left = luma[y * width + Math.max(0, x - 1)];
      const right = luma[y * width + Math.min(width - 1, x + 1)];
      const top = luma[Math.max(0, y - 1) * width + x];
      const bottom = luma[Math.min(height - 1, y + 1) * width + x];
      edges[y * width + x] = Math.min(1, Math.sqrt((right - left) ** 2 + (bottom - top) ** 2) / 2);
    }
  }

  return { width, height, data: edges };
};

const createDifferentFrameAssessment = (reason: string, dimensionsMatch: boolean): RoundTripSameFrameAssessment => ({
  status: "different-frame",
  dimensionsMatch,
  reasons: [reason]
});

export const assessRoundTripSameFrame = (first: RoundTripPixelFrame, second: RoundTripPixelFrame): RoundTripSameFrameAssessment => {
  if (first.width !== second.width || first.height !== second.height) {
    return createDifferentFrameAssessment("两张静帧的分辨率不一致，不能视为同一帧进行数值验收。", false);
  }
  if (first.data.length !== first.width * first.height * 4 || second.data.length !== second.width * second.height * 4) {
    return {
      status: "inconclusive",
      dimensionsMatch: true,
      reasons: ["像素缓冲长度与画幅不一致，无法完成同帧结构检查。"]
    };
  }

  const firstEdges = calculateEdgeMap(first);
  const secondEdges = calculateEdgeMap(second);
  let errorSum = 0;

  for (let index = 0; index < firstEdges.data.length; index += 1) {
    errorSum += Math.abs(firstEdges.data[index] - secondEdges.data[index]);
  }

  const edgeMeanAbsoluteError = errorSum / firstEdges.data.length;
  const edgeStructureSimilarity = 1 - edgeMeanAbsoluteError;
  if (edgeMeanAbsoluteError > SAME_FRAME_MAX_EDGE_MAE) {
    return {
      status: "different-frame",
      dimensionsMatch: true,
      edgeMeanAbsoluteError,
      edgeStructureSimilarity,
      reasons: ["边缘结构差异超过同帧阈值，检测到可能的时间点、裁切、缩放或镜头内容变化。"]
    };
  }

  return {
    status: "same-frame",
    dimensionsMatch: true,
    edgeMeanAbsoluteError,
    edgeStructureSimilarity,
    reasons: ["分辨率一致，且亮度归一化后的边缘结构在固定阈值内相符。"]
  };
};

export const applyCubeToRoundTripFrame = (frame: RoundTripPixelFrame, cube: ParsedCubeLut): RoundTripPixelFrame => {
  if (frame.data.length !== frame.width * frame.height * 4) {
    throw new Error("Round-trip 图像像素长度与分辨率不一致，无法应用 3D LUT。");
  }

  const data = new Uint8ClampedArray(frame.data.length);
  for (let index = 0; index < frame.data.length; index += 4) {
    const mapped = evaluateCubeLut(cube, {
      r: frame.data[index] / 255,
      g: frame.data[index + 1] / 255,
      b: frame.data[index + 2] / 255
    });
    data[index] = clampByte(mapped.r * 255);
    data[index + 1] = clampByte(mapped.g * 255);
    data[index + 2] = clampByte(mapped.b * 255);
    data[index + 3] = frame.data[index + 3];
  }

  return { width: frame.width, height: frame.height, data };
};

const compareFrames = (expected: RoundTripPixelFrame, actual: RoundTripPixelFrame): RoundTripComparisonResult => {
  if (expected.width !== actual.width || expected.height !== actual.height) {
    throw new Error("Round-trip 方向比较要求两张静帧分辨率完全一致。");
  }
  return compareRoundTripPixels({
    expected: expected.data,
    actual: actual.data,
    width: expected.width,
    height: expected.height
  });
};

const createDiagnostic = (
  verdict: RoundTripDiagnostic["verdict"],
  category: RoundTripDiagnostic["category"],
  isWebsiteAlgorithmBug: RoundTripDiagnostic["isWebsiteAlgorithmBug"],
  chineseConclusion: string,
  nextActions: readonly string[],
  signals: readonly string[]
): RoundTripDiagnostic => ({ verdict, category, isWebsiteAlgorithmBug, chineseConclusion, nextActions: nextActions.slice(0, 3), signals });

export const createMissingRoundTripAssetsDiagnostic = (missingNames: readonly string[]): RoundTripDiagnostic => {
  const listed = missingNames.map((name) => `“${name}”`).join("、");
  return createDiagnostic(
    "inconclusive",
    "undetermined",
    "undetermined",
    `缺少真实验收文件：${listed}。当前不能判定网页算法、DaVinci 设置或工作流存在问题。`,
    ["将 PRE、POST 与实际使用的 .cube 复制到 local-test-assets/S16.4.1。", "在弹窗中分别上传 PRE、POST 与 Cube 后运行验收。"],
    ["没有以截图或合成文件替代真实 DaVinci 导出。"]
  );
};

export const releaseRoundTripObjectUrl = (url: string | undefined, revoke: (value: string) => void = URL.revokeObjectURL): void => {
  if (url !== undefined && url.startsWith("blob:")) {
    revoke(url);
  }
};

export const validateRoundTripFrames = ({ pre, post, cube, cubeMatchesCurrentWorkspace, sameFrameAssessment }: RoundTripValidationInput): RoundTripValidationResult => {
  const sameFrame = sameFrameAssessment ?? assessRoundTripSameFrame(pre, post);
  if (sameFrame.status !== "same-frame") {
    return {
      sameFrame,
      diagnostic: createDiagnostic(
        sameFrame.status === "different-frame" ? "different-frame" : "inconclusive",
        "workflow-file",
        "no-evidence",
        sameFrame.status === "different-frame"
          ? "PRE 与 POST 未通过严格同帧结构检查；本次结果无效，不能据此认定网站算法存在误差。"
          : "PRE 与 POST 的像素证据不完整，不能运行可靠的方向比较。",
        ["从同一时间线帧重新导出 PRE 与 POST。", "确认没有裁切、缩放或额外画面处理后再次验收。"],
        sameFrame.reasons
      )
    };
  }

  const preToPostComparison = compareFrames(applyCubeToRoundTripFrame(pre, cube), post);
  const postToPreComparison = compareFrames(applyCubeToRoundTripFrame(post, cube), pre);
  const doubleLutComparison = compareFrames(applyCubeToRoundTripFrame(applyCubeToRoundTripFrame(pre, cube), cube), post);
  const preToPost = { sourceRole: "pre" as const, destinationRole: "post" as const, comparison: preToPostComparison };
  const postToPre = { sourceRole: "post" as const, destinationRole: "pre" as const, comparison: postToPreComparison };

  if (cubeMatchesCurrentWorkspace === "mismatched") {
    return {
      sameFrame,
      preToPost,
      postToPre,
      doubleLutComparison,
      diagnostic: createDiagnostic(
        "wrong-or-stale-cube",
        "workflow-file",
        "no-evidence",
        "上传的 Cube 哈希与当前工作台导出记录不一致；本次只能验证该文件自身，不能用于判断当前网站导出是否一致。",
        ["在 DaVinci 中确认节点使用的 Cube 文件。", "重新导出当前工作台的 Cube，并上传同一文件复验。"],
        ["当前 Cube 哈希不匹配工作台记录。"]
      )
    };
  }

  if (preToPostComparison.passed) {
    return {
      sameFrame,
      preToPost,
      postToPre,
      doubleLutComparison,
      diagnostic: createDiagnostic(
        "validated",
        "undetermined",
        "no-evidence",
        "PRE 经上传 Cube 计算后与 POST 在当前 8-bit 回读容差内一致；没有发现网站 LUT 采样或三线性插值错误的证据。",
        ["保留本次 PRE、POST、Cube 与导出设置作为可重复基准。"],
        ["PRE -> Cube -> POST 方向通过固定回读阈值。"]
      )
    };
  }

  if (postToPreComparison.passed) {
    return {
      sameFrame,
      preToPost,
      postToPre,
      doubleLutComparison,
      diagnostic: createDiagnostic(
        "pre-post-reversed",
        "workflow-file",
        "no-evidence",
        "上传槽位的 PRE / POST 方向疑似反了：POST 经 Cube 后更接近被标记为 PRE 的文件。请交换文件后重跑。",
        ["交换 PRE 与 POST 文件后重新运行。", "确认 PRE 节点未加载创意 LUT。"],
        ["POST -> Cube -> PRE 方向通过，而 PRE -> Cube -> POST 未通过。"]
      )
    };
  }

  if (doubleLutComparison.passed) {
    return {
      sameFrame,
      preToPost,
      postToPre,
      doubleLutComparison,
      diagnostic: createDiagnostic(
        "double-lut-suspected",
        "davinci-settings",
        "no-evidence",
        "POST 更接近对 PRE 连续应用两次同一 Cube 的结果；疑似重复加载 LUT、节点链路重复或把已处理的 POST 当作目标。",
        ["确认创意 LUT 只在一个节点上加载一次。", "确认网页目标素材使用 PRE，而不是已经套 LUT 的 POST。"],
        ["两次 Cube 映射比一次 Cube 映射更匹配 POST。"]
      )
    };
  }

  return {
    sameFrame,
    preToPost,
    postToPre,
    doubleLutComparison,
    diagnostic: createDiagnostic(
      "profile-or-davinci-settings",
      "profile-contract",
      cubeMatchesCurrentWorkspace === "matched" ? "undetermined" : "no-evidence",
      "同帧证据成立，但当前 Cube 未复现 POST。优先检查 Gamma、Full / Legal、Key Output 是否为 1.000、额外节点调节以及 DaVinci 输出 Profile；现有证据不足以认定网页算法错误。",
      ["核对 POST 输出为 Rec.709 / Gamma 2.4 / Full 与节点 Key Output 1.000。", "禁用 LUT 节点后的其他调整后重新导出 POST。", "确认上传 Cube 与 DaVinci 节点中的文件完全一致。"],
      [
        `PRE -> POST RGB MAE: ${preToPostComparison.rgbMeanAbsoluteError.toFixed(6)}。`,
        `自动像素模式: ${preToPostComparison.diagnosis}。`,
        "无法从两张图直接证明 Key Output、额外节点或 DaVinci 文件选择，需按工作流复核。"
      ]
    )
  };
};
