import { cameraDatabase } from "./camera-db";
import type { TechnicalTransformRegistryMatch } from "../types";
import type { VendorLutAsset } from "../types/cameraData";

const normalizeDescriptor = (value: string): string => value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");

const descriptorMatches = (registeredValue: string, selectedValue: string): boolean => {
  return registeredValue === "unknown" || normalizeDescriptor(registeredValue) === normalizeDescriptor(selectedValue);
};

const isCompatibleAsset = (asset: VendorLutAsset, modelId: string, inputGamma: string, inputGamut: string): boolean => {
  return asset.modelIds.includes(modelId) && descriptorMatches(asset.inputGamma, inputGamma) && descriptorMatches(asset.inputGamut, inputGamut);
};

const toRegistryMatch = (asset: VendorLutAsset): TechnicalTransformRegistryMatch => {
  const source = cameraDatabase.sources.find((candidate) => asset.sourceIds.includes(candidate.id));

  return {
    assetId: asset.id,
    title: asset.title,
    ...(source === undefined ? {} : { sourceId: source.id }),
    inputGamma: asset.inputGamma,
    inputGamut: asset.inputGamut,
    outputSpace: asset.outputSpace,
    ...(asset.sha256 === undefined ? {} : { expectedSha256: asset.sha256.toLowerCase() }),
    supportedCubeSizes: asset.cubeSizes,
    officialMetadataVerified: asset.verificationStatus === "verified-official"
  };
};

export const getTechnicalTransformRegistryMatches = (
  modelId: string,
  inputGamma: string,
  inputGamut: string
): readonly TechnicalTransformRegistryMatch[] => {
  return cameraDatabase.vendorLutAssets.filter((asset) => isCompatibleAsset(asset, modelId, inputGamma, inputGamut)).map(toRegistryMatch);
};
