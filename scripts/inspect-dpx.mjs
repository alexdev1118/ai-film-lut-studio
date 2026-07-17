import { open } from "node:fs/promises";
import { resolve } from "node:path";

const FILE_INFORMATION_HEADER_BYTES = 768;
const IMAGE_INFORMATION_FIXED_BYTES = 12;
const IMAGE_ELEMENT_HEADER_BYTES = 72;
const IMAGE_ELEMENT_START_OFFSET = FILE_INFORMATION_HEADER_BYTES + IMAGE_INFORMATION_FIXED_BYTES;
const MINIMUM_HEADER_BYTES = 2048;

const formatHex = (value, width) => `0x${value.toString(16).toUpperCase().padStart(width, "0")}`;

const readAscii = (buffer, offset, length) => {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    const byte = buffer[offset + index];
    if (byte === 0) {
      break;
    }
    value += String.fromCharCode(byte);
  }
  return value.trim();
};

const getByteOrder = (magic) => {
  if (magic === "SDPX") {
    return { name: "big-endian", littleEndian: false };
  }
  if (magic === "XPDS") {
    return { name: "little-endian", littleEndian: true };
  }
  throw new Error(`Unsupported DPX magic: ${JSON.stringify(magic)}`);
};

const rawBytes = (buffer, offset, length) => Array.from(buffer.subarray(offset, offset + length), (value) => value.toString(16).toUpperCase().padStart(2, "0")).join(" ");

const inspectElement = (view, buffer, index, littleEndian) => {
  const baseOffset = IMAGE_ELEMENT_START_OFFSET + index * IMAGE_ELEMENT_HEADER_BYTES;
  const dataSignOffset = baseOffset;
  const descriptorOffset = baseOffset + 20;
  const packingOffset = baseOffset + 24;
  const encodingOffset = baseOffset + 26;
  const dataOffsetOffset = baseOffset + 28;

  return {
    index,
    baseOffset,
    offsets: {
      dataSign: dataSignOffset,
      referenceLowDataCode: baseOffset + 4,
      referenceHighDataCode: baseOffset + 12,
      descriptor: descriptorOffset,
      transferCharacteristic: baseOffset + 21,
      colorimetricSpecification: baseOffset + 22,
      bitDepth: baseOffset + 23,
      packing: packingOffset,
      encoding: encodingOffset,
      dataOffset: dataOffsetOffset,
      endOfLinePadding: baseOffset + 32,
      endOfImagePadding: baseOffset + 36,
      description: baseOffset + 40
    },
    dataSign: {
      rawBytes: rawBytes(buffer, dataSignOffset, 4),
      value: view.getUint32(dataSignOffset, littleEndian)
    },
    referenceLowDataCode: view.getUint32(baseOffset + 4, littleEndian),
    referenceHighDataCode: view.getUint32(baseOffset + 12, littleEndian),
    descriptor: view.getUint8(descriptorOffset),
    transferCharacteristic: view.getUint8(baseOffset + 21),
    colorimetricSpecification: view.getUint8(baseOffset + 22),
    bitDepth: view.getUint8(baseOffset + 23),
    packing: view.getUint16(packingOffset, littleEndian),
    encoding: view.getUint16(encodingOffset, littleEndian),
    dataOffset: view.getUint32(dataOffsetOffset, littleEndian),
    endOfLinePadding: view.getUint32(baseOffset + 32, littleEndian),
    endOfImagePadding: view.getUint32(baseOffset + 36, littleEndian),
    description: readAscii(buffer, baseOffset + 40, 32)
  };
};

const inspectDpx = async (filePath) => {
  let handle;

  try {
    handle = await open(filePath, "r");
    const stats = await handle.stat();
    const buffer = Buffer.alloc(MINIMUM_HEADER_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead < MINIMUM_HEADER_BYTES) {
      throw new Error(`DPX header is truncated: read ${bytesRead} of ${MINIMUM_HEADER_BYTES} bytes.`);
    }

    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const magic = readAscii(buffer, 0, 4);
    const byteOrder = getByteOrder(magic);
    const imageElementCount = view.getUint16(770, byteOrder.littleEndian);
    const elements = [];

    for (let index = 0; index < imageElementCount; index += 1) {
      const baseOffset = IMAGE_ELEMENT_START_OFFSET + index * IMAGE_ELEMENT_HEADER_BYTES;
      if (baseOffset + IMAGE_ELEMENT_HEADER_BYTES > buffer.length) {
        throw new Error(`Image Element ${index} exceeds the 2048-byte DPX header.`);
      }
      elements.push(inspectElement(view, buffer, index, byteOrder.littleEndian));
    }

    return {
      filePath,
      fileSize: stats.size,
      magic: { rawBytes: rawBytes(buffer, 0, 4), text: magic },
      endianness: byteOrder.name,
      imageDataOffset: view.getUint32(4, byteOrder.littleEndian),
      version: readAscii(buffer, 8, 8),
      declaredFileSize: view.getUint32(16, byteOrder.littleEndian),
      genericHeaderLength: view.getUint32(24, byteOrder.littleEndian),
      industryHeaderLength: view.getUint32(28, byteOrder.littleEndian),
      userHeaderLength: view.getUint32(32, byteOrder.littleEndian),
      orientation: view.getUint16(768, byteOrder.littleEndian),
      imageElementCount,
      width: view.getUint32(772, byteOrder.littleEndian),
      height: view.getUint32(776, byteOrder.littleEndian),
      parserOffsets: {
        imageElementStart: IMAGE_ELEMENT_START_OFFSET,
        imageElementHeaderBytes: IMAGE_ELEMENT_HEADER_BYTES,
        legacyIncorrectElementStart: 800,
        legacyIncorrectDataSignRawBytes: rawBytes(buffer, 800, 4),
        legacyIncorrectDataSignValue: view.getUint32(800, byteOrder.littleEndian)
      },
      elements
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown DPX inspection error.";
    throw new Error(`Unable to inspect DPX header: ${message}`);
  } finally {
    if (handle !== undefined) {
      await handle.close();
    }
  }
};

const inputPath = process.argv[2];

if (typeof inputPath !== "string" || inputPath.trim().length === 0) {
  console.error("Usage: node scripts/inspect-dpx.mjs <path-to-file.dpx>");
  process.exitCode = 1;
} else {
  try {
    const report = await inspectDpx(resolve(inputPath));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown inspection error.";
    console.error(message);
    process.exitCode = 1;
  }
}
