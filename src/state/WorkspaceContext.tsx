import { createContext, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { defaultCameraProfile } from "../data/cameraProfiles";
import { lutStyles } from "../data/styles";
import type { CameraBrand, ColorSpace, CubeExportResult, LutParameters, PostLutNamingMode, PreviewResult, WorkspaceMediaState } from "../types";
import { revokeColorPreviewUrl } from "../utils/colorPreview";
import { colorSpaceOptions, defaultLutParameters } from "../utils/lutMock";
import { revokeMediaItem } from "../utils/image";
import { sanitizeLookName } from "../utils/lutNaming";

interface PersistedWorkspaceState {
  readonly parameters: LutParameters;
  readonly skinProtect: boolean;
  readonly preserveLuma: boolean;
  readonly avoidOversaturation: boolean;
  readonly selectedBrandId: CameraBrand;
  readonly selectedProfileId: string;
  readonly lutName: string;
  readonly postNamingMode: PostLutNamingMode;
  readonly postCustomFileName: string;
  readonly selectedStyleKey: string;
}

interface WorkspaceContextValue {
  readonly mediaState: WorkspaceMediaState;
  readonly setMediaState: Dispatch<SetStateAction<WorkspaceMediaState>>;
  readonly targetImageError: string;
  readonly setTargetImageError: Dispatch<SetStateAction<string>>;
  readonly referenceImageError: string;
  readonly setReferenceImageError: Dispatch<SetStateAction<string>>;
  readonly parameters: LutParameters;
  readonly setParameters: Dispatch<SetStateAction<LutParameters>>;
  readonly result: PreviewResult | null;
  readonly setResult: Dispatch<SetStateAction<PreviewResult | null>>;
  readonly sessionPreviewResults: readonly PreviewResult[];
  readonly setSessionPreviewResults: Dispatch<SetStateAction<readonly PreviewResult[]>>;
  readonly message: string;
  readonly setMessage: Dispatch<SetStateAction<string>>;
  readonly skinProtect: boolean;
  readonly setSkinProtect: Dispatch<SetStateAction<boolean>>;
  readonly preserveLuma: boolean;
  readonly setPreserveLuma: Dispatch<SetStateAction<boolean>>;
  readonly avoidOversaturation: boolean;
  readonly setAvoidOversaturation: Dispatch<SetStateAction<boolean>>;
  readonly selectedBrandId: CameraBrand;
  readonly setSelectedBrandId: Dispatch<SetStateAction<CameraBrand>>;
  readonly selectedProfileId: string;
  readonly setSelectedProfileId: Dispatch<SetStateAction<string>>;
  readonly lutName: string;
  readonly setLutName: Dispatch<SetStateAction<string>>;
  readonly postNamingMode: PostLutNamingMode;
  readonly setPostNamingMode: Dispatch<SetStateAction<PostLutNamingMode>>;
  readonly postCustomFileName: string;
  readonly setPostCustomFileName: Dispatch<SetStateAction<string>>;
  readonly selectedStyleKey: string;
  readonly setSelectedStyleKey: Dispatch<SetStateAction<string>>;
  readonly lastExportResult: CubeExportResult | null;
  readonly setLastExportResult: Dispatch<SetStateAction<CubeExportResult | null>>;
}

const workspaceSessionStorageKey = "ai-film-lut-studio-workspace-state";

const defaultMediaState: WorkspaceMediaState = {
  targetItems: [],
  referenceItems: []
};

const defaultPersistedWorkspaceState: PersistedWorkspaceState = {
  parameters: {
    ...defaultLutParameters,
    intensity: lutStyles[0].recommendedIntensity
  },
  skinProtect: true,
  preserveLuma: true,
  avoidOversaturation: false,
  selectedBrandId: defaultCameraProfile.brandId,
  selectedProfileId: defaultCameraProfile.id,
  lutName: "CustomLook",
  postNamingMode: "simple",
  postCustomFileName: "",
  selectedStyleKey: lutStyles[0].id
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const isString = (value: unknown): value is string => typeof value === "string";

const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

const readPostNamingMode = (value: unknown): PostLutNamingMode => (value === "full" ? "full" : "simple");

const migrateLookName = (value: string): string => {
  const normalized = value.trim().replace(/_Studio_V1$/i, "");
  return sanitizeLookName(normalized);
};

const readColorSpace = (value: unknown): ColorSpace => {
  return colorSpaceOptions.some((colorSpace) => colorSpace === value) ? (value as ColorSpace) : defaultPersistedWorkspaceState.parameters.inputColorSpace;
};

const readPersistedWorkspaceState = (): PersistedWorkspaceState => {
  try {
    const rawValue = window.sessionStorage.getItem(workspaceSessionStorageKey);
    if (rawValue === null) {
      return defaultPersistedWorkspaceState;
    }

    const parsedValue: unknown = JSON.parse(rawValue);
    if (!isRecord(parsedValue)) {
      return defaultPersistedWorkspaceState;
    }

    const parsedParameters = isRecord(parsedValue.parameters) ? parsedValue.parameters : {};
    return {
      parameters: {
        ...defaultPersistedWorkspaceState.parameters,
        intensity: isNumber(parsedParameters.intensity) ? parsedParameters.intensity : defaultPersistedWorkspaceState.parameters.intensity,
        contrast: isNumber(parsedParameters.contrast) ? parsedParameters.contrast : defaultPersistedWorkspaceState.parameters.contrast,
        saturation: isNumber(parsedParameters.saturation) ? parsedParameters.saturation : defaultPersistedWorkspaceState.parameters.saturation,
        temperature: isNumber(parsedParameters.temperature) ? parsedParameters.temperature : defaultPersistedWorkspaceState.parameters.temperature,
        shadowMatch: isNumber(parsedParameters.shadowMatch) ? parsedParameters.shadowMatch : defaultPersistedWorkspaceState.parameters.shadowMatch,
        midtoneMatch: isNumber(parsedParameters.midtoneMatch) ? parsedParameters.midtoneMatch : defaultPersistedWorkspaceState.parameters.midtoneMatch,
        highlightMatch: isNumber(parsedParameters.highlightMatch) ? parsedParameters.highlightMatch : defaultPersistedWorkspaceState.parameters.highlightMatch,
        tint: isNumber(parsedParameters.tint) ? parsedParameters.tint : defaultPersistedWorkspaceState.parameters.tint,
        inputColorSpace: readColorSpace(parsedParameters.inputColorSpace),
        precision:
          parsedParameters.precision === "17x17x17" || parsedParameters.precision === "33x33x33" || parsedParameters.precision === "65x65x65"
            ? parsedParameters.precision
            : defaultPersistedWorkspaceState.parameters.precision
      },
      skinProtect: isBoolean(parsedValue.skinProtect) ? parsedValue.skinProtect : defaultPersistedWorkspaceState.skinProtect,
      preserveLuma: isBoolean(parsedValue.preserveLuma) ? parsedValue.preserveLuma : defaultPersistedWorkspaceState.preserveLuma,
      avoidOversaturation: isBoolean(parsedValue.avoidOversaturation) ? parsedValue.avoidOversaturation : defaultPersistedWorkspaceState.avoidOversaturation,
      selectedBrandId: isString(parsedValue.selectedBrandId) ? (parsedValue.selectedBrandId as CameraBrand) : defaultPersistedWorkspaceState.selectedBrandId,
      selectedProfileId: isString(parsedValue.selectedProfileId) ? parsedValue.selectedProfileId : defaultPersistedWorkspaceState.selectedProfileId,
      lutName: isString(parsedValue.lutName) ? migrateLookName(parsedValue.lutName) : defaultPersistedWorkspaceState.lutName,
      postNamingMode: readPostNamingMode(parsedValue.postNamingMode),
      postCustomFileName: isString(parsedValue.postCustomFileName) ? parsedValue.postCustomFileName : "",
      selectedStyleKey: isString(parsedValue.selectedStyleKey) ? parsedValue.selectedStyleKey : defaultPersistedWorkspaceState.selectedStyleKey
    };
  } catch (error) {
    console.warn("读取工作台会话状态失败", error);
    return defaultPersistedWorkspaceState;
  }
};

const revokePreviewResult = (result: PreviewResult | null): void => {
  if (result?.isCanvasPreview === true) {
    revokeColorPreviewUrl(result.previewImage);
  }
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider = ({ children }: { readonly children: ReactNode }) => {
  const persistedState = useMemo(() => readPersistedWorkspaceState(), []);
  const [mediaState, setMediaState] = useState<WorkspaceMediaState>(defaultMediaState);
  const [targetImageError, setTargetImageError] = useState("");
  const [referenceImageError, setReferenceImageError] = useState("");
  const [parameters, setParameters] = useState<LutParameters>(persistedState.parameters);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [sessionPreviewResults, setSessionPreviewResults] = useState<readonly PreviewResult[]>([]);
  const [message, setMessage] = useState("AI 就绪");
  const [skinProtect, setSkinProtect] = useState(persistedState.skinProtect);
  const [preserveLuma, setPreserveLuma] = useState(persistedState.preserveLuma);
  const [avoidOversaturation, setAvoidOversaturation] = useState(persistedState.avoidOversaturation);
  const [selectedBrandId, setSelectedBrandId] = useState<CameraBrand>(persistedState.selectedBrandId);
  const [selectedProfileId, setSelectedProfileId] = useState(persistedState.selectedProfileId);
  const [lutName, setLutName] = useState(persistedState.lutName);
  const [postNamingMode, setPostNamingMode] = useState<PostLutNamingMode>(persistedState.postNamingMode);
  const [postCustomFileName, setPostCustomFileName] = useState(persistedState.postCustomFileName);
  const [selectedStyleKey, setSelectedStyleKey] = useState(persistedState.selectedStyleKey);
  const [lastExportResult, setLastExportResult] = useState<CubeExportResult | null>(null);
  const cleanupRef = useRef({ mediaState, result });

  useEffect(() => {
    cleanupRef.current = { mediaState, result };
  }, [mediaState, result]);

  useEffect(() => {
    try {
      const nextPersistedState: PersistedWorkspaceState = {
        parameters,
        skinProtect,
        preserveLuma,
        avoidOversaturation,
        selectedBrandId,
        selectedProfileId,
        lutName,
        postNamingMode,
        postCustomFileName,
        selectedStyleKey
      };
      window.sessionStorage.setItem(workspaceSessionStorageKey, JSON.stringify(nextPersistedState));
    } catch (error) {
      console.warn("保存工作台会话状态失败", error);
    }
  }, [parameters, skinProtect, preserveLuma, avoidOversaturation, selectedBrandId, selectedProfileId, lutName, postNamingMode, postCustomFileName, selectedStyleKey]);

  useEffect(() => {
    return () => {
      cleanupRef.current.mediaState.targetItems.forEach((item) => revokeMediaItem(item));
      cleanupRef.current.mediaState.referenceItems.forEach((item) => revokeMediaItem(item));
      revokePreviewResult(cleanupRef.current.result);
    };
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      mediaState,
      setMediaState,
      targetImageError,
      setTargetImageError,
      referenceImageError,
      setReferenceImageError,
      parameters,
      setParameters,
      result,
      setResult,
      sessionPreviewResults,
      setSessionPreviewResults,
      message,
      setMessage,
      skinProtect,
      setSkinProtect,
      preserveLuma,
      setPreserveLuma,
      avoidOversaturation,
      setAvoidOversaturation,
      selectedBrandId,
      setSelectedBrandId,
      selectedProfileId,
      setSelectedProfileId,
      lutName,
      setLutName,
      postNamingMode,
      setPostNamingMode,
      postCustomFileName,
      setPostCustomFileName,
      selectedStyleKey,
      setSelectedStyleKey,
      lastExportResult,
      setLastExportResult
    }),
    [
      mediaState,
      targetImageError,
      referenceImageError,
      parameters,
      result,
      sessionPreviewResults,
      message,
      skinProtect,
      preserveLuma,
      avoidOversaturation,
      selectedBrandId,
      selectedProfileId,
      lutName,
      postNamingMode,
      postCustomFileName,
      selectedStyleKey,
      lastExportResult
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspaceState = (): WorkspaceContextValue => {
  const context = useContext(WorkspaceContext);

  if (context === null) {
    throw new Error("useWorkspaceState must be used within WorkspaceProvider");
  }

  return context;
};

export const revokeWorkspacePreviewResult = revokePreviewResult;
