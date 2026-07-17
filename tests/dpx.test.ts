import assert from "node:assert/strict";
import test from "node:test";
import { decodeDpxPixels } from "../src/utils/dpx/dpxDecoder";
import { parseDpxMetadata } from "../src/utils/dpx/dpxParser";
import { dpxPreviewToMediaItem } from "../src/utils/dpx/dpxPreview";
import { DpxDecodeError } from "../src/utils/dpx/dpxTypes";

type FixtureEndianness = "big-endian" | "little-endian";

interface FixtureOptions {
  readonly endianness: FixtureEndianness;
  readonly bitDepth: 8 | 10 | 12 | 16;
  readonly packing: 0 | 1;
  readonly descriptor?: 50 | 51;
  readonly width: number;
  readonly height: number;
  readonly pixels: readonly (readonly number[])[];
  readonly linePadding?: number;
  readonly orientation?: 0 | 1 | 2 | 3;
  readonly encoding?: number;
  readonly dataSign?: number;
}

const HEADER_BYTES = 2048;
const IMAGE_ELEMENT_OFFSET = 780;

const writeAscii = (bytes: Uint8Array, offset: number, value: string): void => {
  for (let index = 0; index < value.length; index += 1) {
    bytes[offset + index] = value.charCodeAt(index);
  }
};

const writePackedPixel = (
  output: Uint8Array,
  bitOffset: number,
  samples: readonly number[],
  bitDepth: number,
  littleEndian: boolean
): void => {
  let currentOffset = bitOffset;

  for (const sample of samples) {
    for (let bit = 0; bit < bitDepth; bit += 1) {
      const sourceBit = littleEndian ? bit : bitDepth - 1 - bit;
      const bitValue = (sample >> sourceBit) & 1;
      const byteIndex = Math.floor(currentOffset / 8);
      const bitIndex = currentOffset % 8;
      output[byteIndex] |= littleEndian ? bitValue << bitIndex : bitValue << (7 - bitIndex);
      currentOffset += 1;
    }
  }
};

const getLineBytes = (width: number, channelCount: number, bitDepth: number, packing: 0 | 1): number => {
  if (packing === 0) {
    return Math.ceil((width * channelCount * bitDepth) / 8);
  }
  if (bitDepth === 10 && channelCount === 3) {
    return width * 4;
  }
  if (bitDepth === 12 && channelCount === 3) {
    return width * 6;
  }
  return width * channelCount * (bitDepth <= 8 ? 1 : 2);
};

const createDpxFixture = (options: FixtureOptions): ArrayBuffer => {
  const descriptor = options.descriptor ?? 50;
  const channelCount = descriptor === 50 ? 3 : 4;
  const littleEndian = options.endianness === "little-endian";
  const linePadding = options.linePadding ?? 0;
  const lineBytes = getLineBytes(options.width, channelCount, options.bitDepth, options.packing);
  const dataOffset = HEADER_BYTES;
  const buffer = new ArrayBuffer(dataOffset + (lineBytes + linePadding) * options.height);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  writeAscii(bytes, 0, littleEndian ? "XPDS" : "SDPX");
  view.setUint32(4, dataOffset, littleEndian);
  writeAscii(bytes, 8, "V2.0");
  view.setUint32(16, buffer.byteLength, littleEndian);
  view.setUint16(768, options.orientation ?? 0, littleEndian);
  view.setUint16(770, 1, littleEndian);
  view.setUint32(772, options.width, littleEndian);
  view.setUint32(776, options.height, littleEndian);
  view.setUint32(IMAGE_ELEMENT_OFFSET, options.dataSign ?? 0, littleEndian);
  bytes[IMAGE_ELEMENT_OFFSET + 20] = descriptor;
  bytes[IMAGE_ELEMENT_OFFSET + 21] = 0;
  bytes[IMAGE_ELEMENT_OFFSET + 22] = 0;
  bytes[IMAGE_ELEMENT_OFFSET + 23] = options.bitDepth;
  view.setUint16(IMAGE_ELEMENT_OFFSET + 24, options.packing, littleEndian);
  view.setUint16(IMAGE_ELEMENT_OFFSET + 26, options.encoding ?? 0, littleEndian);
  view.setUint32(IMAGE_ELEMENT_OFFSET + 28, dataOffset, littleEndian);
  view.setUint32(IMAGE_ELEMENT_OFFSET + 32, linePadding, littleEndian);
  view.setUint32(IMAGE_ELEMENT_OFFSET + 36, 0, littleEndian);

  for (let y = 0; y < options.height; y += 1) {
    const lineOffset = dataOffset + y * (lineBytes + linePadding);
    for (let x = 0; x < options.width; x += 1) {
      const samples = options.pixels[y * options.width + x];
      if (samples === undefined || samples.length !== channelCount) {
        throw new Error("Fixture pixel channels do not match its DPX descriptor.");
      }
      if (options.packing === 0) {
        const line = bytes.subarray(lineOffset, lineOffset + lineBytes);
        writePackedPixel(line, x * channelCount * options.bitDepth, samples, options.bitDepth, littleEndian);
      } else if (options.bitDepth === 10 && channelCount === 3) {
        const word = (samples[0] << 22) | (samples[1] << 12) | (samples[2] << 2);
        view.setUint32(lineOffset + x * 4, word >>> 0, littleEndian);
      } else {
        const bytesPerComponent = options.bitDepth <= 8 ? 1 : 2;
        const pixelOffset = lineOffset + x * channelCount * bytesPerComponent;
        for (let channel = 0; channel < channelCount; channel += 1) {
          const sample = samples[channel];
          if (bytesPerComponent === 1) {
            view.setUint8(pixelOffset + channel, sample);
          } else {
            const filledValue = options.bitDepth === 12 ? sample << 4 : options.bitDepth === 10 ? sample << 6 : sample;
            view.setUint16(pixelOffset + channel * 2, filledValue, littleEndian);
          }
        }
      }
    }
  }

  return buffer;
};

const decodeFixture = (options: FixtureOptions) => {
  const buffer = createDpxFixture(options);
  const metadata = parseDpxMetadata(buffer, "fixture.dpx", buffer.byteLength);
  return { metadata, pixels: decodeDpxPixels(buffer, metadata, 2048) };
};

const getPixel = (data: Uint8ClampedArray, width: number, x: number, y: number): readonly number[] => {
  const offset = (y * width + x) * 4;
  return [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];
};

test("parses and decodes a big-endian 8-bit RGB DPX with line padding", () => {
  const { metadata, pixels } = decodeFixture({
    endianness: "big-endian",
    bitDepth: 8,
    packing: 0,
    width: 3,
    height: 1,
    linePadding: 4,
    pixels: [[0, 0, 0], [255, 0, 0], [0, 255, 0]]
  });

  assert.equal(metadata.header.endianness, "big-endian");
  assert.equal(metadata.header.width, 3);
  assert.equal(metadata.imageElement.linePadding, 4);
  assert.deepEqual(getPixel(pixels.data, pixels.width, 0, 0), [0, 0, 0, 255]);
  assert.deepEqual(getPixel(pixels.data, pixels.width, 1, 0), [255, 0, 0, 255]);
  assert.deepEqual(getPixel(pixels.data, pixels.width, 2, 0), [0, 255, 0, 255]);
});

test("uses the DaVinci-compatible Image Element Header base at byte 780", () => {
  const buffer = createDpxFixture({
    endianness: "big-endian",
    bitDepth: 10,
    packing: 1,
    width: 1,
    height: 1,
    pixels: [[1023, 0, 0]]
  });
  const view = new DataView(buffer);
  view.setUint32(24, 1664, false);
  view.setUint32(28, 384, false);
  view.setUint32(32, 6144, false);
  const metadata = parseDpxMetadata(buffer, "davinci-layout.dpx", buffer.byteLength);

  assert.equal(metadata.header.genericHeaderLength, 1664);
  assert.equal(metadata.header.industryHeaderLength, 384);
  assert.equal(metadata.header.userHeaderLength, 6144);
  assert.equal(metadata.imageElement.dataSign, 0);
  assert.equal(metadata.imageElement.descriptor, 50);
  assert.equal(metadata.imageElement.bitDepth, 10);
  assert.equal(metadata.imageElement.packing, 1);
  assert.equal(metadata.imageElement.encoding, 0);
  assert.equal(metadata.imageElement.dataOffset, HEADER_BYTES);
});

test("parses and decodes a little-endian 8-bit RGB DPX", () => {
  const { metadata, pixels } = decodeFixture({
    endianness: "little-endian",
    bitDepth: 8,
    packing: 0,
    width: 2,
    height: 1,
    pixels: [[0, 0, 255], [255, 255, 255]]
  });

  assert.equal(metadata.header.endianness, "little-endian");
  assert.deepEqual(getPixel(pixels.data, pixels.width, 0, 0), [0, 0, 255, 255]);
  assert.deepEqual(getPixel(pixels.data, pixels.width, 1, 0), [255, 255, 255, 255]);
});

test("normalizes a filled 10-bit RGB DPX without channel swapping", () => {
  const { pixels } = decodeFixture({
    endianness: "big-endian",
    bitDepth: 10,
    packing: 1,
    width: 2,
    height: 1,
    pixels: [[1023, 0, 0], [0, 512, 1023]]
  });

  assert.deepEqual(getPixel(pixels.data, pixels.width, 0, 0), [255, 0, 0, 255]);
  assert.deepEqual(getPixel(pixels.data, pixels.width, 1, 0), [0, 128, 255, 255]);
});

test("normalizes a filled 12-bit RGB DPX", () => {
  const { pixels } = decodeFixture({
    endianness: "little-endian",
    bitDepth: 12,
    packing: 1,
    width: 1,
    height: 1,
    pixels: [[2048, 4095, 0]]
  });

  assert.deepEqual(getPixel(pixels.data, pixels.width, 0, 0), [128, 255, 0, 255]);
});

test("normalizes a 16-bit RGBA DPX and preserves alpha", () => {
  const { metadata, pixels } = decodeFixture({
    endianness: "big-endian",
    bitDepth: 16,
    packing: 1,
    descriptor: 51,
    width: 1,
    height: 1,
    pixels: [[65535, 0, 32768, 65535]]
  });

  assert.equal(metadata.imageElement.channelOrder, "RGBA");
  assert.deepEqual(getPixel(pixels.data, pixels.width, 0, 0), [255, 0, 128, 255]);
});

test("applies top-to-bottom orientation without vertical inversion", () => {
  const { pixels } = decodeFixture({
    endianness: "big-endian",
    bitDepth: 8,
    packing: 0,
    width: 1,
    height: 2,
    orientation: 2,
    pixels: [[255, 0, 0], [0, 0, 255]]
  });

  assert.deepEqual(getPixel(pixels.data, pixels.width, 0, 0), [0, 0, 255, 255]);
  assert.deepEqual(getPixel(pixels.data, pixels.width, 0, 1), [255, 0, 0, 255]);
});

test("rejects an invalid DPX magic number", () => {
  const invalid = new ArrayBuffer(2048);
  assert.throws(() => parseDpxMetadata(invalid, "invalid.dpx", invalid.byteLength), (error: unknown) => {
    return error instanceof DpxDecodeError && error.support.code === "invalid-magic-number";
  });
});

test("rejects truncated DPX pixel data", () => {
  const buffer = createDpxFixture({
    endianness: "big-endian",
    bitDepth: 8,
    packing: 0,
    width: 2,
    height: 1,
    pixels: [[0, 0, 0], [255, 255, 255]]
  }).slice(0, 2049);
  new DataView(buffer).setUint32(16, buffer.byteLength, false);
  const metadata = parseDpxMetadata(buffer, "truncated.dpx", buffer.byteLength);
  assert.throws(() => decodeDpxPixels(buffer, metadata), (error: unknown) => {
    return error instanceof DpxDecodeError && error.support.code === "truncated-pixel-data";
  });
});

test("rejects unsupported descriptor and compressed encoding with useful statuses", () => {
  const unsupportedDescriptor = createDpxFixture({
    endianness: "big-endian",
    bitDepth: 8,
    packing: 0,
    width: 1,
    height: 1,
    pixels: [[0, 0, 0]]
  });
  new Uint8Array(unsupportedDescriptor)[IMAGE_ELEMENT_OFFSET + 20] = 100;
  assert.throws(() => parseDpxMetadata(unsupportedDescriptor, "ycbcr.dpx", unsupportedDescriptor.byteLength), (error: unknown) => {
    return error instanceof DpxDecodeError && error.support.code === "unsupported-descriptor";
  });

  const compressed = createDpxFixture({
    endianness: "big-endian",
    bitDepth: 8,
    packing: 0,
    width: 1,
    height: 1,
    encoding: 1,
    pixels: [[0, 0, 0]]
  });
  assert.throws(() => parseDpxMetadata(compressed, "compressed.dpx", compressed.byteLength), (error: unknown) => {
    return error instanceof DpxDecodeError && error.support.code === "unsupported-encoding";
  });
});

test("rejects signed and malformed Data Sign values with distinct diagnostics", () => {
  const signed = createDpxFixture({
    endianness: "big-endian",
    bitDepth: 8,
    packing: 0,
    width: 1,
    height: 1,
    dataSign: 1,
    pixels: [[0, 0, 0]]
  });
  assert.throws(() => parseDpxMetadata(signed, "signed.dpx", signed.byteLength), (error: unknown) => {
    return error instanceof DpxDecodeError && error.support.code === "signed-pixels";
  });

  const malformed = createDpxFixture({
    endianness: "big-endian",
    bitDepth: 8,
    packing: 0,
    width: 1,
    height: 1,
    pixels: [[0, 0, 0]]
  });
  new DataView(malformed).setUint32(IMAGE_ELEMENT_OFFSET, 838926858, false);
  assert.throws(() => parseDpxMetadata(malformed, "malformed-sign.dpx", malformed.byteLength), (error: unknown) => {
    return error instanceof DpxDecodeError && error.support.code === "invalid-data-sign" && error.message.includes("字段偏移为 780") && error.message.includes("32 01 02 0A");
  });
});

test("selects a supported image element when a multi-element Header includes an unsupported element", () => {
  const buffer = createDpxFixture({
    endianness: "big-endian",
    bitDepth: 8,
    packing: 0,
    width: 1,
    height: 1,
    pixels: [[255, 0, 0]]
  });
  const view = new DataView(buffer);
  view.setUint16(770, 2, false);
  new Uint8Array(buffer)[IMAGE_ELEMENT_OFFSET + 20] = 100;
  const secondElement = IMAGE_ELEMENT_OFFSET + 72;
  view.setUint32(secondElement, 0, false);
  new Uint8Array(buffer)[secondElement + 20] = 50;
  new Uint8Array(buffer)[secondElement + 23] = 8;
  view.setUint16(secondElement + 24, 0, false);
  view.setUint16(secondElement + 26, 0, false);
  view.setUint32(secondElement + 28, HEADER_BYTES, false);
  const metadata = parseDpxMetadata(buffer, "multi-element.dpx", buffer.byteLength);
  const pixels = decodeDpxPixels(buffer, metadata);

  assert.equal(metadata.imageElement.index, 1);
  assert.deepEqual(getPixel(pixels.data, pixels.width, 0, 0), [255, 0, 0, 255]);
});

test("stores only DPX preview metadata in the workspace media item", () => {
  const buffer = createDpxFixture({
    endianness: "big-endian",
    bitDepth: 10,
    packing: 1,
    width: 1,
    height: 1,
    pixels: [[1023, 0, 0]]
  });
  const metadata = parseDpxMetadata(buffer, "davinci-frame.dpx", buffer.byteLength);
  const file = new File([buffer], "davinci-frame.dpx", { type: "image/x-dpx" });
  const mediaItem = dpxPreviewToMediaItem(file, "target", {
    metadata,
    previewUrl: "blob:dpx-preview",
    previewWidth: 1,
    previewHeight: 1
  });

  assert.equal(mediaItem.file, undefined);
  assert.equal(mediaItem.url, "blob:dpx-preview");
  assert.equal(mediaItem.originalFormat, "DPX");
  assert.equal(mediaItem.sourceBitDepth, 10);
  assert.equal(mediaItem.sourceDescriptor, 50);
  assert.equal(mediaItem.sourcePacking, 1);
  assert.equal(mediaItem.sourceEncoding, 0);
  assert.equal(mediaItem.sourceDataSign, 0);
  assert.equal(mediaItem.previewConverted, true);
  assert.equal(mediaItem.colorTransformApplied, false);
});
