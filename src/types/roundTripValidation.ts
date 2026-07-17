import type { ColorEncodingProfileId, RoundTripComparisonResult } from "./colorContracts";
import type { ParsedCubeLut } from "./colorPipeline";

export type RoundTripAssetRole = "pre" | "post";

export type RoundTripAssetDecodeStatus = "decoded" | "unsupported" | "failed";

export type RoundTripSameFrameStatus = "same-frame" | "different-frame" | "inconclusive";

export type RoundTripWorkflowCategory =
  | "workflow-file"
  | "davinci-settings"
  | "profile-contract"
  | "web-algorithm"
  | "undetermined";

export type RoundTripVerdict =
  | "validated"
  | "pre-post-reversed"
  | "different-frame"
  | "double-lut-suspected"
  | "wrong-or-stale-cube"
  | "profile-or-davinci-settings"
  | "inconclusive";

export interface RoundTripPixelFrame {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface RoundTripDpxSummary {
  readonly magicNumber: string;
  readonly endianness: "big-endian" | "little-endian";
  readonly bitDepth: number;
  readonly descriptor: number;
  readonly channelOrder: "RGB" | "RGBA";
  readonly packing: number;
  readonly encoding: number;
  readonly dataSign: number;
  readonly transferCharacteristic: number;
  readonly colorimetricSpecification: number;
  readonly orientation: number;
  readonly linePadding: number;
  readonly imagePadding: number;
}

export interface RoundTripAssetSummary {
  readonly role: RoundTripAssetRole;
  readonly name: string;
  readonly size: number;
  readonly contentHash: string;
  readonly width: number;
  readonly height: number;
  readonly container: "png" | "tiff" | "dpx";
  readonly profileId: ColorEncodingProfileId;
  readonly decodeStatus: RoundTripAssetDecodeStatus;
  readonly url: string;
  readonly dpx?: RoundTripDpxSummary;
  readonly decodeMessage?: string;
}

export interface RoundTripSameFrameAssessment {
  readonly status: RoundTripSameFrameStatus;
  readonly dimensionsMatch: boolean;
  readonly edgeMeanAbsoluteError?: number;
  readonly edgeStructureSimilarity?: number;
  readonly reasons: readonly string[];
}

export interface RoundTripDirectionalComparison {
  readonly sourceRole: RoundTripAssetRole;
  readonly destinationRole: RoundTripAssetRole;
  readonly comparison: RoundTripComparisonResult;
}

export interface RoundTripCubeContract {
  readonly fileName: string;
  readonly contentHash: string;
  readonly title?: string;
  readonly lutSize: 17 | 33 | 65;
  readonly dataLineCount: number;
  readonly expectedDataLineCount: number;
  readonly inputContract?: string;
  readonly outputContract?: string;
  readonly inputProfileId?: string;
  readonly outputProfileId?: string;
  readonly range?: string;
  readonly transferFunction?: string;
  readonly technicalConversionIncluded?: string;
  readonly validationPassed: boolean;
  readonly currentWorkspaceCubeMatch: "matched" | "mismatched" | "not-available";
  readonly warnings: readonly string[];
}

export interface RoundTripDiagnostic {
  readonly verdict: RoundTripVerdict;
  readonly category: RoundTripWorkflowCategory;
  readonly isWebsiteAlgorithmBug: "no-evidence" | "proven" | "undetermined";
  readonly chineseConclusion: string;
  readonly nextActions: readonly string[];
  readonly signals: readonly string[];
}

export interface RoundTripValidationResult {
  readonly sameFrame: RoundTripSameFrameAssessment;
  readonly preToPost?: RoundTripDirectionalComparison;
  readonly postToPre?: RoundTripDirectionalComparison;
  readonly doubleLutComparison?: RoundTripComparisonResult;
  readonly diagnostic: RoundTripDiagnostic;
}

export interface RoundTripValidationInput {
  readonly pre: RoundTripPixelFrame;
  readonly post: RoundTripPixelFrame;
  readonly cube: ParsedCubeLut;
  readonly cubeMatchesCurrentWorkspace: "matched" | "mismatched" | "not-available";
  readonly sameFrameAssessment?: RoundTripSameFrameAssessment;
}
