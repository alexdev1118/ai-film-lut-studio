export type DpxEndianness = "big-endian" | "little-endian";

export const DPX_MAX_SOURCE_FILE_BYTES = 512 * 1024 * 1024;

export type DpxSupportState = "supported" | "unsupported" | "invalid";

export type DpxDecodePhase = "reading" | "parsing-header" | "decoding-pixels" | "generating-preview" | "complete" | "unsupported" | "failed";

export interface DpxSupportStatus {
  readonly state: DpxSupportState;
  readonly code: string;
  readonly message: string;
  readonly suggestion: string;
}

export interface DpxHeader {
  readonly magicNumber: string;
  readonly endianness: DpxEndianness;
  readonly version: string;
  readonly declaredFileSize: number;
  readonly genericHeaderLength: number;
  readonly industryHeaderLength: number;
  readonly userHeaderLength: number;
  readonly imageDataOffset: number;
  readonly orientation: number;
  readonly imageElementCount: number;
  readonly width: number;
  readonly height: number;
}

export interface DpxImageElement {
  readonly index: number;
  readonly dataSign: number;
  readonly dataSignRawBytes: string;
  readonly descriptor: number;
  readonly transferCharacteristic: number;
  readonly colorimetricSpecification: number;
  readonly bitDepth: number;
  readonly packing: number;
  readonly encoding: number;
  readonly dataOffset: number;
  readonly linePadding: number;
  readonly imagePadding: number;
  readonly channelCount: 3 | 4;
  readonly channelOrder: "RGB" | "RGBA";
}

export interface DpxMetadata {
  readonly fileName: string;
  readonly fileSize: number;
  readonly header: DpxHeader;
  readonly imageElement: DpxImageElement;
  readonly support: DpxSupportStatus;
}

export interface DpxDecodedPixels {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface DpxDecodeResult {
  readonly metadata: DpxMetadata;
  readonly pixels: DpxDecodedPixels;
}

export interface DpxPreviewResult {
  readonly metadata: DpxMetadata;
  readonly previewUrl: string;
  readonly previewWidth: number;
  readonly previewHeight: number;
}

export interface DpxDecodeProgress {
  readonly phase: DpxDecodePhase;
  readonly message: string;
}

export type DpxDecodeProgressHandler = (progress: DpxDecodeProgress) => void;

export class DpxDecodeError extends Error {
  public readonly support: DpxSupportStatus;

  public constructor(support: DpxSupportStatus) {
    super(support.message);
    this.name = "DpxDecodeError";
    this.support = support;
  }
}
