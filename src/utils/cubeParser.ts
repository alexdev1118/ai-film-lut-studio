import type { CubeParseResult, ParsedCubeLut, RgbColor, SupportedCubeSize } from "../types";

const supportedCubeSizes: readonly SupportedCubeSize[] = [17, 33, 65];
const maxReportedIssues = 24;

export class CubeParseError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`.cube 文件解析失败：${issues.join("；")}`);
    this.name = "CubeParseError";
    this.issues = issues;
  }
}

const parseFiniteNumbers = (tokens: readonly string[], expectedCount: number, lineNumber: number, label: string): number[] | null => {
  if (tokens.length !== expectedCount) {
    return null;
  }

  const values = tokens.map((token) => Number(token));
  if (values.some((value) => !Number.isFinite(value))) {
    throw new CubeParseError([`第 ${lineNumber} 行 ${label} 包含 NaN 或非数字值`]);
  }

  return values;
};

const toRgb = (values: readonly number[]): RgbColor => ({ r: values[0], g: values[1], b: values[2] });

const parseTitle = (line: string, lineNumber: number): string => {
  const match = /^TITLE\s+(?:"([^"]*)"|(.+))$/i.exec(line);
  const title = (match?.[1] ?? match?.[2] ?? "").trim();

  if (title.length === 0) {
    throw new CubeParseError([`第 ${lineNumber} 行 TITLE 为空或格式无效`]);
  }

  return title;
};

const isSupportedSize = (value: number): value is SupportedCubeSize => supportedCubeSizes.some((size) => size === value);

export const parseCubeLut = (content: string): CubeParseResult => {
  if (content.trim().length === 0) {
    throw new CubeParseError(["文件内容为空"]);
  }

  let title: string | undefined;
  let size: SupportedCubeSize | undefined;
  let domainMin: RgbColor | undefined;
  let domainMax: RgbColor | undefined;
  let compactDomainSeen = false;
  const data: RgbColor[] = [];
  const comments: string[] = [];
  const warnings: string[] = [];
  const issues: string[] = [];
  let omittedIssueCount = 0;

  const addIssue = (message: string): void => {
    if (issues.length < maxReportedIssues) {
      issues.push(message);
      return;
    }

    omittedIssueCount += 1;
  };

  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);

  lines.forEach((rawLine, zeroBasedIndex) => {
    const lineNumber = zeroBasedIndex + 1;
    const commentIndex = rawLine.indexOf("#");

    if (commentIndex >= 0) {
      const comment = rawLine.slice(commentIndex + 1).trim();
      if (comment.length > 0) {
        comments.push(comment);
      }
    }

    const line = (commentIndex >= 0 ? rawLine.slice(0, commentIndex) : rawLine).trim();
    if (line.length === 0) {
      return;
    }

    const tokens = line.split(/\s+/);
    const directive = tokens[0].toUpperCase();

    try {
      if (directive === "TITLE") {
        if (title !== undefined) {
          addIssue(`第 ${lineNumber} 行重复 TITLE`);
          return;
        }
        title = parseTitle(line, lineNumber);
        return;
      }

      if (directive === "LUT_1D_SIZE") {
        addIssue(`第 ${lineNumber} 行为 LUT_1D_SIZE；当前仅支持 3D .cube LUT`);
        return;
      }

      if (directive === "LUT_3D_SIZE") {
        if (size !== undefined) {
          addIssue(`第 ${lineNumber} 行重复 LUT_3D_SIZE`);
          return;
        }

        const values = parseFiniteNumbers(tokens.slice(1), 1, lineNumber, "LUT_3D_SIZE");
        const parsedSize = values?.[0];
        if (parsedSize === undefined || !Number.isInteger(parsedSize) || !isSupportedSize(parsedSize)) {
          addIssue(`第 ${lineNumber} 行 LUT_3D_SIZE 必须是 17、33 或 65`);
          return;
        }
        size = parsedSize;
        return;
      }

      if (directive === "DOMAIN_MIN" || directive === "DOMAIN_MAX") {
        const isMin = directive === "DOMAIN_MIN";
        if ((isMin && domainMin !== undefined) || (!isMin && domainMax !== undefined) || compactDomainSeen) {
          addIssue(`第 ${lineNumber} 行重复或冲突的 ${directive}`);
          return;
        }

        const values = parseFiniteNumbers(tokens.slice(1), 3, lineNumber, directive);
        if (values === null) {
          addIssue(`第 ${lineNumber} 行 ${directive} 必须包含 3 个数字`);
          return;
        }

        if (isMin) {
          domainMin = toRgb(values);
        } else {
          domainMax = toRgb(values);
        }
        return;
      }

      if (directive === "LUT_3D_INPUT_RANGE") {
        if (compactDomainSeen || domainMin !== undefined || domainMax !== undefined) {
          addIssue(`第 ${lineNumber} 行重复或冲突的 LUT_3D_INPUT_RANGE`);
          return;
        }

        const values = parseFiniteNumbers(tokens.slice(1), 2, lineNumber, "LUT_3D_INPUT_RANGE");
        if (values === null) {
          addIssue(`第 ${lineNumber} 行 LUT_3D_INPUT_RANGE 必须包含 2 个数字`);
          return;
        }
        domainMin = { r: values[0], g: values[0], b: values[0] };
        domainMax = { r: values[1], g: values[1], b: values[1] };
        compactDomainSeen = true;
        return;
      }

      const values = parseFiniteNumbers(tokens, 3, lineNumber, "RGB 数据");
      if (values === null) {
        addIssue(`第 ${lineNumber} 行不是受支持的指令，也不是 3 列 RGB 数据`);
        return;
      }

      if (values.some((value) => value < 0 || value > 1)) {
        addIssue(`第 ${lineNumber} 行 RGB 数据超出 0 到 1 范围`);
        return;
      }
      data.push(toRgb(values));
    } catch (error) {
      if (error instanceof CubeParseError) {
        error.issues.forEach(addIssue);
        return;
      }

      const message = error instanceof Error ? error.message : "未知解析错误";
      addIssue(`第 ${lineNumber} 行解析失败：${message}`);
    }
  });

  if (title === undefined) {
    warnings.push("文件未包含 TITLE，将使用文件名作为显示名称。");
  }
  if (size === undefined) {
    issues.push("缺少有效的 LUT_3D_SIZE");
  }

  const resolvedDomainMin = domainMin ?? { r: 0, g: 0, b: 0 };
  const resolvedDomainMax = domainMax ?? { r: 1, g: 1, b: 1 };
  if (domainMin === undefined || domainMax === undefined) {
    warnings.push("未完整声明 DOMAIN_MIN / DOMAIN_MAX，按 0 到 1 处理。");
  }

  if (
    resolvedDomainMin.r >= resolvedDomainMax.r ||
    resolvedDomainMin.g >= resolvedDomainMax.g ||
    resolvedDomainMin.b >= resolvedDomainMax.b
  ) {
    issues.push("DOMAIN_MIN 的每个通道都必须小于 DOMAIN_MAX");
  }

  if (size !== undefined) {
    const expectedCount = size * size * size;
    if (data.length !== expectedCount) {
      issues.push(`RGB 数据行数为 ${data.length}，但 ${size} 点 3D LUT 需要 ${expectedCount} 行`);
    }
  }

  if (omittedIssueCount > 0) {
    issues.push(`另有 ${omittedIssueCount} 个同类错误未逐条显示`);
  }

  if (issues.length > 0 || size === undefined) {
    throw new CubeParseError(issues);
  }

  const lut: ParsedCubeLut = {
    ...(title === undefined ? {} : { title }),
    size,
    domainMin: resolvedDomainMin,
    domainMax: resolvedDomainMax,
    data,
    comments
  };

  return { lut, warnings };
};
