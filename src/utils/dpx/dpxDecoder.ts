import { DpxDecodeError, type DpxDecodedPixels, type DpxImageElement, type DpxMetadata, type DpxSupportStatus } from "./dpxTypes";

interface DecodeDimensions {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
}

const MAX_PREVIEW_LONG_SIDE = 2048;

const fail = (code: string, message: string, suggestion: string): never => {
  const support: DpxSupportStatus = { state: "invalid", code, message, suggestion };
  throw new DpxDecodeError(support);
};

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

const scalePreview = (width: number, height: number, maxLongSide: number): DecodeDimensions => {
  const longSide = Math.max(width, height);
  const scale = longSide > maxLongSide ? maxLongSide / longSide : 1;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale
  };
};

const readUnsigned = (view: DataView, offset: number, bytes: number, littleEndian: boolean): number => {
  if (bytes === 1) {
    return view.getUint8(offset);
  }
  if (bytes === 2) {
    return view.getUint16(offset, littleEndian);
  }
  return view.getUint32(offset, littleEndian);
};

const normalizeSample = (value: number, bitDepth: number): number => {
  const maximum = (2 ** bitDepth) - 1;
  return clampUnit(value / maximum);
};

const getPackedLineBytes = (width: number, element: DpxImageElement): number => Math.ceil((width * element.channelCount * element.bitDepth) / 8);

const getFilledLineBytes = (width: number, element: DpxImageElement): number => {
  if (element.bitDepth === 10 && element.channelCount === 3) {
    return width * 4;
  }
  if (element.bitDepth === 12 && element.channelCount === 3) {
    return width * 6;
  }
  const bytesPerComponent = element.bitDepth <= 8 ? 1 : 2;
  return width * element.channelCount * bytesPerComponent;
};

const readPackedSample = (
  bytes: Uint8Array,
  bitOffset: number,
  bitDepth: number,
  littleEndian: boolean
): number => {
  let value = 0;

  for (let bit = 0; bit < bitDepth; bit += 1) {
    const position = bitOffset + bit;
    const byteIndex = Math.floor(position / 8);
    const bitIndex = position % 8;
    const bitValue = littleEndian ? (bytes[byteIndex] >> bitIndex) & 1 : (bytes[byteIndex] >> (7 - bitIndex)) & 1;
    value = littleEndian ? value | (bitValue << bit) : (value << 1) | bitValue;
  }

  return value;
};

const readPackedPixel = (
  bytes: Uint8Array,
  pixelIndex: number,
  element: DpxImageElement,
  littleEndian: boolean
): readonly number[] => {
  const firstBit = pixelIndex * element.channelCount * element.bitDepth;
  const samples: number[] = [];

  for (let channel = 0; channel < element.channelCount; channel += 1) {
    const bitOffset = firstBit + channel * element.bitDepth;
    samples.push(readPackedSample(bytes, bitOffset, element.bitDepth, littleEndian));
  }

  return samples;
};

const readFilledPixel = (
  view: DataView,
  lineOffset: number,
  pixelIndex: number,
  element: DpxImageElement,
  littleEndian: boolean
): readonly number[] => {
  if (element.bitDepth === 10 && element.channelCount === 3) {
    const word = readUnsigned(view, lineOffset + pixelIndex * 4, 4, littleEndian);
    return [(word >>> 22) & 0x3ff, (word >>> 12) & 0x3ff, (word >>> 2) & 0x3ff];
  }

  const bytesPerComponent = element.bitDepth <= 8 ? 1 : 2;
  const pixelOffset = lineOffset + pixelIndex * element.channelCount * bytesPerComponent;
  const samples: number[] = [];

  for (let channel = 0; channel < element.channelCount; channel += 1) {
    const value = readUnsigned(view, pixelOffset + channel * bytesPerComponent, bytesPerComponent, littleEndian);
    if (element.bitDepth === 12) {
      samples.push(value >>> 4);
    } else if (element.bitDepth === 10) {
      samples.push(value >>> 6);
    } else {
      samples.push(value);
    }
  }

  return samples;
};

const mapCoordinate = (coordinate: number, length: number, flip: boolean): number => (flip ? length - 1 - coordinate : coordinate);

const writePreviewPixel = (
  output: Uint8ClampedArray,
  outputWidth: number,
  x: number,
  y: number,
  samples: readonly number[],
  bitDepth: number
): void => {
  const outputOffset = (y * outputWidth + x) * 4;
  output[outputOffset] = Math.round(normalizeSample(samples[0], bitDepth) * 255);
  output[outputOffset + 1] = Math.round(normalizeSample(samples[1], bitDepth) * 255);
  output[outputOffset + 2] = Math.round(normalizeSample(samples[2], bitDepth) * 255);
  output[outputOffset + 3] = samples.length === 4 ? Math.round(normalizeSample(samples[3], bitDepth) * 255) : 255;
};

export const decodeDpxPixels = (buffer: ArrayBuffer, metadata: DpxMetadata, maxLongSide = MAX_PREVIEW_LONG_SIDE): DpxDecodedPixels => {
  const { header, imageElement } = metadata;
  const dimensions = scalePreview(header.width, header.height, maxLongSide);
  const littleEndian = header.endianness === "little-endian";
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const lineBytes = imageElement.packing === 0 ? getPackedLineBytes(header.width, imageElement) : getFilledLineBytes(header.width, imageElement);
  const lineStride = lineBytes + imageElement.linePadding;
  const requiredBytes = header.imageDataOffset + lineStride * header.height + imageElement.imagePadding;

  if (requiredBytes > buffer.byteLength) {
    fail(
      "truncated-pixel-data",
      "DPX 图像数据长度不足，Header 中的行填充或像素数据与实际文件不匹配。",
      "请检查文件是否传输完整，或在 DaVinci Resolve 中重新导出无压缩 DPX。"
    );
  }

  const output = new Uint8ClampedArray(dimensions.width * dimensions.height * 4);
  const flipX = header.orientation === 1 || header.orientation === 3;
  const flipY = header.orientation === 2 || header.orientation === 3;

  for (let outputY = 0; outputY < dimensions.height; outputY += 1) {
    const sourceY = Math.min(header.height - 1, Math.floor(outputY / dimensions.scale));
    const mappedY = mapCoordinate(sourceY, header.height, flipY);
    const lineOffset = header.imageDataOffset + mappedY * lineStride;
    const packedLine = imageElement.packing === 0 ? bytes.subarray(lineOffset, lineOffset + lineBytes) : undefined;

    for (let outputX = 0; outputX < dimensions.width; outputX += 1) {
      const sourceX = Math.min(header.width - 1, Math.floor(outputX / dimensions.scale));
      const mappedX = mapCoordinate(sourceX, header.width, flipX);
      const samples =
        imageElement.packing === 0
          ? readPackedPixel(packedLine ?? new Uint8Array(), mappedX, imageElement, littleEndian)
          : readFilledPixel(view, lineOffset, mappedX, imageElement, littleEndian);
      writePreviewPixel(output, dimensions.width, outputX, outputY, samples, imageElement.bitDepth);
    }
  }

  return { width: dimensions.width, height: dimensions.height, data: output };
};
