import { DPX_MAX_SOURCE_FILE_BYTES, DpxDecodeError, type DpxEndianness, type DpxHeader, type DpxImageElement, type DpxMetadata, type DpxSupportStatus } from "./dpxTypes";

const DPX_HEADER_BYTES = 2048;
const IMAGE_INFORMATION_OFFSET = 768;
const IMAGE_INFORMATION_FIXED_BYTES = 12;
const IMAGE_ELEMENT_OFFSET = IMAGE_INFORMATION_OFFSET + IMAGE_INFORMATION_FIXED_BYTES;
const IMAGE_ELEMENT_HEADER_BYTES = 72;
const MAX_SOURCE_PIXELS = 32 * 1024 * 1024;

const createSupport = (
  state: DpxSupportStatus["state"],
  code: string,
  message: string,
  suggestion: string
): DpxSupportStatus => ({ state, code, message, suggestion });

const invalid = (code: string, message: string, suggestion: string): never => {
  throw new DpxDecodeError(createSupport("invalid", code, message, suggestion));
};

const unsupported = (code: string, message: string, suggestion: string): never => {
  throw new DpxDecodeError(createSupport("unsupported", code, message, suggestion));
};

const readAscii = (view: DataView, offset: number, length: number): string => {
  let result = "";

  for (let index = 0; index < length; index += 1) {
    const value = view.getUint8(offset + index);
    if (value === 0) {
      break;
    }
    result += String.fromCharCode(value);
  }

  return result.trim();
};

const readRawBytes = (view: DataView, offset: number, length: number): string => {
  const values: string[] = [];

  for (let index = 0; index < length; index += 1) {
    values.push(view.getUint8(offset + index).toString(16).toUpperCase().padStart(2, "0"));
  }

  return values.join(" ");
};

const readMagic = (view: DataView): { readonly magicNumber: string; readonly endianness: DpxEndianness } => {
  const magicNumber = readAscii(view, 0, 4);

  if (magicNumber === "SDPX") {
    return { magicNumber, endianness: "big-endian" };
  }
  if (magicNumber === "XPDS") {
    return { magicNumber, endianness: "little-endian" };
  }

  return invalid(
    "invalid-magic-number",
    "该文件不是可识别的 DPX：文件头缺少 SDPX 或 XPDS Magic Number。",
    "请确认从 DaVinci Resolve 导出的是 DPX 静帧，或改为导出 PNG / TIFF。"
  );
};

const getFileByteOrder = (endianness: DpxEndianness): boolean => endianness === "little-endian";

const validateFileBounds = (fileSize: number, bufferSize: number): void => {
  if (fileSize <= 0) {
    invalid("empty-file", "DPX 文件为空。", "请重新导出静帧后再试。");
  }
  if (fileSize > DPX_MAX_SOURCE_FILE_BYTES) {
    unsupported(
      "file-too-large",
      "DPX 文件超过 512MB，本地浏览器解码可能造成内存风险。",
      "建议在 DaVinci Resolve 中导出 PNG / TIFF，或降低静帧分辨率后再导入。"
    );
  }
  if (bufferSize < DPX_HEADER_BYTES) {
    invalid("truncated-header", "DPX 文件过短，无法读取完整 2048 字节 Header。", "请检查导出的 DPX 是否完整。 ");
  }
};

const parseImageElement = (view: DataView, index: number, littleEndian: boolean): DpxImageElement => {
  const baseOffset = IMAGE_ELEMENT_OFFSET + index * IMAGE_ELEMENT_HEADER_BYTES;
  const dataSignRawBytes = readRawBytes(view, baseOffset, 4);
  const dataSign = view.getUint32(baseOffset, littleEndian);
  const descriptor = view.getUint8(baseOffset + 20);
  const transferCharacteristic = view.getUint8(baseOffset + 21);
  const colorimetricSpecification = view.getUint8(baseOffset + 22);
  const bitDepth = view.getUint8(baseOffset + 23);
  const packing = view.getUint16(baseOffset + 24, littleEndian);
  const encoding = view.getUint16(baseOffset + 26, littleEndian);
  const dataOffset = view.getUint32(baseOffset + 28, littleEndian);
  const linePadding = view.getUint32(baseOffset + 32, littleEndian);
  const imagePadding = view.getUint32(baseOffset + 36, littleEndian);

  if (dataSign === 1) {
    unsupported(
      "signed-pixels",
      "该 DPX 使用有符号像素数据（Data Sign=1），当前版本暂不支持。",
      "请在 DaVinci Resolve 中以无压缩 RGB DPX 或 PNG / TIFF 导出。"
    );
  }
  if (dataSign !== 0) {
    invalid(
      "invalid-data-sign",
      `DPX Header 解析异常：Data Sign 应为 0 或 1，但读取到 ${dataSign}。字段偏移为 ${baseOffset}，原始字节为 ${dataSignRawBytes}。`,
      "该文件可能使用不兼容的 DPX Header 或图像元素结构，请在 DaVinci Resolve 中导出标准无压缩 RGB DPX、TIFF 或 PNG。"
    );
  }
  if (descriptor !== 50 && descriptor !== 51) {
    unsupported(
      "unsupported-descriptor",
      `识别到 DPX Descriptor=${descriptor}，当前支持 RGB(50) 与 RGBA(51)。`,
      "请在 DaVinci Resolve 中选择 RGB 或 RGBA DPX；YCbCr、CbYCrY 和多元素 DPX 暂不支持。"
    );
  }
  if (bitDepth !== 8 && bitDepth !== 10 && bitDepth !== 12 && bitDepth !== 16) {
    unsupported(
      "unsupported-bit-depth",
      `识别到 ${bitDepth}-bit DPX，当前支持 8 / 10 / 12 / 16-bit。`,
      "请导出 8、10、12 或 16-bit 无压缩 RGB DPX，或改为 PNG / TIFF。"
    );
  }
  if (packing !== 0 && packing !== 1) {
    unsupported(
      "unsupported-packing",
      `识别到 DPX Packing=${packing}，当前支持 packed(0) 与 filled(1)。`,
      "请在 DaVinci Resolve 中选择未压缩的 packed 或 filled DPX 设置。"
    );
  }
  if (encoding !== 0) {
    unsupported(
      "unsupported-encoding",
      `识别到 DPX Encoding=${encoding}，当前仅支持无压缩 DPX。`,
      "请关闭 RLE 或其他压缩后重新导出，或改为 PNG / TIFF。"
    );
  }

  return {
    index,
    dataSign,
    dataSignRawBytes,
    descriptor,
    transferCharacteristic,
    colorimetricSpecification,
    bitDepth,
    packing,
    encoding,
    dataOffset,
    linePadding,
    imagePadding,
    channelCount: descriptor === 50 ? 3 : 4,
    channelOrder: descriptor === 50 ? "RGB" : "RGBA"
  };
};

export const parseDpxMetadata = (buffer: ArrayBuffer, fileName: string, fileSize: number): DpxMetadata => {
  validateFileBounds(fileSize, buffer.byteLength);
  const view = new DataView(buffer);
  const magic = readMagic(view);
  const littleEndian = getFileByteOrder(magic.endianness);
  const imageDataOffset = view.getUint32(4, littleEndian);
  const version = readAscii(view, 8, 8);
  const declaredFileSize = view.getUint32(16, littleEndian);
  const genericHeaderLength = view.getUint32(24, littleEndian);
  const industryHeaderLength = view.getUint32(28, littleEndian);
  const userHeaderLength = view.getUint32(32, littleEndian);
  const orientation = view.getUint16(IMAGE_INFORMATION_OFFSET, littleEndian);
  const imageElementCount = view.getUint16(IMAGE_INFORMATION_OFFSET + 2, littleEndian);
  const width = view.getUint32(IMAGE_INFORMATION_OFFSET + 4, littleEndian);
  const height = view.getUint32(IMAGE_INFORMATION_OFFSET + 8, littleEndian);

  if (version.length === 0) {
    invalid("missing-version", "DPX Header 没有可识别的版本字段。", "请检查文件是否损坏，或在 DaVinci Resolve 中重新导出。 ");
  }
  if (imageElementCount === 0 || imageElementCount > 8) {
    invalid(
      "invalid-image-element-count",
      `DPX Header 中的图像元素数量为 ${imageElementCount}，不在标准 1-8 元素范围内。`,
      "请检查文件是否损坏，或在 DaVinci Resolve 中重新导出 DPX。"
    );
  }
  if (width === 0 || height === 0) {
    invalid("invalid-dimensions", "DPX Header 中的图像宽高无效。", "请检查文件是否损坏。 ");
  }
  if (width * height > MAX_SOURCE_PIXELS) {
    unsupported(
      "image-too-large",
      `DPX 原始分辨率为 ${width}x${height}，超过本地预览的安全像素上限。`,
      "建议在 DaVinci Resolve 中导出较小静帧，或先缩放至 2048px 附近再导入。"
    );
  }
  if (orientation > 3) {
    unsupported(
      "unsupported-orientation",
      `识别到 DPX Orientation=${orientation}，当前仅支持不需要旋转的 0-3 方向。`,
      "请在 DaVinci Resolve 中以常规横向或竖向 DPX 重新导出。"
    );
  }

  let imageElement: DpxImageElement | undefined;
  let firstElementError: DpxDecodeError | undefined;

  for (let index = 0; index < imageElementCount; index += 1) {
    const baseOffset = IMAGE_ELEMENT_OFFSET + index * IMAGE_ELEMENT_HEADER_BYTES;

    if (baseOffset + IMAGE_ELEMENT_HEADER_BYTES > DPX_HEADER_BYTES) {
      invalid(
        "truncated-image-element-header",
        `DPX Image Element ${index} 超出固定 2048 字节 Header。`,
        "请检查文件是否完整，或重新导出 DPX。"
      );
    }

    try {
      const candidate = parseImageElement(view, index, littleEndian);
      if (imageElement === undefined) {
        imageElement = candidate;
      }
    } catch (error) {
      if (firstElementError === undefined && error instanceof DpxDecodeError) {
        firstElementError = error;
      }
    }
  }

  if (imageElement === undefined) {
    throw firstElementError ?? new DpxDecodeError(createSupport("unsupported", "unsupported-image-elements", "DPX 中没有可解码的 RGB / RGBA 图像元素。", "请导出无压缩 RGB DPX、TIFF 或 PNG。"));
  }
  const resolvedDataOffset = imageElement.dataOffset > 0 ? imageElement.dataOffset : imageDataOffset;

  if (resolvedDataOffset < DPX_HEADER_BYTES || resolvedDataOffset >= buffer.byteLength) {
    invalid("invalid-data-offset", "DPX 图像数据偏移无效或超出文件范围。", "请检查该 DPX 是否完整，或在 DaVinci Resolve 中重新导出。 ");
  }
  if (declaredFileSize > 0 && declaredFileSize > buffer.byteLength) {
    invalid("truncated-file", "DPX Header 声明的文件大小大于实际文件，文件可能不完整。", "请重新导出或重新复制该 DPX 文件。 ");
  }

  return {
    fileName,
    fileSize,
    header: {
      magicNumber: magic.magicNumber,
      endianness: magic.endianness,
      version,
      declaredFileSize,
      genericHeaderLength,
      industryHeaderLength,
      userHeaderLength,
      imageDataOffset: resolvedDataOffset,
      orientation,
      imageElementCount,
      width,
      height
    },
    imageElement: {
      ...imageElement,
      dataOffset: resolvedDataOffset
    },
    support: createSupport(
      "supported",
      "supported-dpx",
      `${imageElement.bitDepth}-bit ${imageElement.channelOrder} DPX 已识别。`,
      "将生成本地 8-bit 预览；未应用 Log 或技术色彩空间转换。"
    )
  };
};
