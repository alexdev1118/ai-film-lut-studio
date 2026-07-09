export interface CubeValidationResult {
  readonly isValid: boolean;
  readonly lutSize?: number;
  readonly dataLineCount?: number;
  readonly expectedDataLineCount?: number;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

const allowedSizes = new Set([17, 33, 65]);

const isNumeric = (value: string): boolean => {
  return value.trim().length > 0 && Number.isFinite(Number(value));
};

const isDataLine = (line: string): boolean => {
  const parts = line.trim().split(/\s+/);
  return parts.length === 3 && parts.every(isNumeric);
};

export const validateCubeLut = (content: string): CubeValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  const hasTitle = lines.some((line) => line.toUpperCase().startsWith("TITLE"));
  const sizeLine = lines.find((line) => line.toUpperCase().startsWith("LUT_3D_SIZE"));
  const hasDomainMin = lines.some((line) => line.toUpperCase().startsWith("DOMAIN_MIN"));
  const hasDomainMax = lines.some((line) => line.toUpperCase().startsWith("DOMAIN_MAX"));
  const dataLines = lines.filter(isDataLine);
  let lutSize: number | undefined;
  let expectedDataLineCount: number | undefined;

  if (!hasTitle) {
    errors.push("缺少 TITLE。");
  }

  if (sizeLine === undefined) {
    errors.push("缺少 LUT_3D_SIZE。");
  } else {
    const parts = sizeLine.split(/\s+/);
    const parsedSize = Number(parts[1]);

    if (!Number.isInteger(parsedSize)) {
      errors.push("LUT_3D_SIZE 不是整数。");
    } else {
      lutSize = parsedSize;
      expectedDataLineCount = parsedSize * parsedSize * parsedSize;

      if (!allowedSizes.has(parsedSize)) {
        errors.push("LUT_3D_SIZE 必须为 17、33 或 65。");
      }
    }
  }

  if (!hasDomainMin) {
    errors.push("缺少 DOMAIN_MIN。");
  }

  if (!hasDomainMax) {
    errors.push("缺少 DOMAIN_MAX。");
  }

  if (expectedDataLineCount !== undefined && dataLines.length !== expectedDataLineCount) {
    errors.push(`LUT 数据行数不正确：当前 ${dataLines.length} 行，期望 ${expectedDataLineCount} 行。`);
  }

  lines.forEach((line, lineIndex) => {
    const upperLine = line.toUpperCase();

    if (
      upperLine.startsWith("TITLE") ||
      upperLine.startsWith("LUT_3D_SIZE") ||
      upperLine.startsWith("DOMAIN_MIN") ||
      upperLine.startsWith("DOMAIN_MAX")
    ) {
      return;
    }

    if (!isDataLine(line)) {
      errors.push(`第 ${lineIndex + 1} 行不是合法 RGB 数据行。`);
      return;
    }

    const values = line.split(/\s+/).map(Number);
    values.forEach((value, valueIndex) => {
      if (value < 0 || value > 1) {
        errors.push(`第 ${lineIndex + 1} 行第 ${valueIndex + 1} 个 RGB 值超出 0~1 范围。`);
      }
    });
  });

  if (lutSize === 65) {
    warnings.push("65 精度 LUT 文件较大，部分软件导入和浏览器下载可能需要更长时间。");
  }

  return {
    isValid: errors.length === 0,
    lutSize,
    dataLineCount: dataLines.length,
    expectedDataLineCount,
    errors,
    warnings
  };
};
