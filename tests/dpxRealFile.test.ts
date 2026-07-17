import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";
import { decodeDpxPixels } from "../src/utils/dpx/dpxDecoder";
import { parseDpxMetadata } from "../src/utils/dpx/dpxParser";

const realDpxPath = process.env.DPX_REAL_FILE;

const loadFileAsArrayBuffer = (filePath: string): ArrayBuffer => {
  const source = readFileSync(filePath);
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);
  return copy.buffer;
};

test("decodes the explicitly configured real DaVinci DPX file", { skip: realDpxPath === undefined ? "DPX_REAL_FILE is not configured." : false }, () => {
  if (realDpxPath === undefined) {
    return;
  }

  const fileSize = statSync(realDpxPath).size;
  const buffer = loadFileAsArrayBuffer(realDpxPath);
  const metadata = parseDpxMetadata(buffer, "real-davinci.dpx", fileSize);
  const pixels = decodeDpxPixels(buffer, metadata);
  let minimum = 255;
  let maximum = 0;

  for (let index = 0; index < pixels.data.length; index += 4096) {
    minimum = Math.min(minimum, pixels.data[index], pixels.data[index + 1], pixels.data[index + 2]);
    maximum = Math.max(maximum, pixels.data[index], pixels.data[index + 1], pixels.data[index + 2]);
  }

  assert.equal(metadata.header.magicNumber, "SDPX");
  assert.equal(metadata.header.endianness, "big-endian");
  assert.equal(metadata.header.width, 3840);
  assert.equal(metadata.header.height, 2160);
  assert.equal(metadata.imageElement.dataSign, 0);
  assert.equal(metadata.imageElement.descriptor, 50);
  assert.equal(metadata.imageElement.bitDepth, 16);
  assert.equal(metadata.imageElement.packing, 0);
  assert.equal(metadata.imageElement.encoding, 0);
  assert.equal(metadata.imageElement.dataOffset, 8192);
  assert.equal(pixels.width, 2048);
  assert.equal(pixels.height, 1152);
  assert.ok(maximum > minimum, "Decoded real DPX preview should contain visible RGB variation.");
});
