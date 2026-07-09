import type {
  CameraBrand,
  CameraProfile,
  CameraProfileCategory,
  CameraProfileDataStatus,
  CameraProfileSourceStatus,
  InputColorConfig,
  InputType
} from "../types";

interface BrandOption {
  readonly id: CameraBrand;
  readonly label: string;
  readonly category: CameraProfileCategory;
}

interface ProfileInput {
  readonly id: string;
  readonly brandId: CameraBrand;
  readonly brand: string;
  readonly brandLabel: string;
  readonly modelFamily?: string;
  readonly label: string;
  readonly gamma: string;
  readonly gamut: string;
  readonly inputType: InputType;
  readonly category: CameraProfileCategory;
  readonly dataStatus?: CameraProfileDataStatus;
  readonly sourceStatus?: CameraProfileSourceStatus;
  readonly canUseDirectly?: boolean;
}

export const cameraBrandOptions: readonly BrandOption[] = [
  { id: "generic", label: "通用", category: "generic" },
  { id: "sony", label: "Sony", category: "mirrorless" },
  { id: "canon", label: "Canon", category: "mirrorless" },
  { id: "dji", label: "DJI", category: "drone" },
  { id: "panasonic", label: "Panasonic", category: "mirrorless" },
  { id: "fujifilm", label: "Fujifilm", category: "mirrorless" },
  { id: "nikon", label: "Nikon", category: "mirrorless" },
  { id: "blackmagic", label: "Blackmagic", category: "cinema" },
  { id: "gopro", label: "GoPro / Action Camera", category: "action" },
  { id: "apple", label: "Apple / Mobile", category: "mobile" },
  { id: "arri", label: "ARRI", category: "cinema" },
  { id: "red", label: "RED", category: "cinema" },
  { id: "kinefinity", label: "Kinefinity", category: "cinema" },
  { id: "zcam", label: "Z CAM", category: "cinema" },
  { id: "leica", label: "Leica", category: "mirrorless" },
  { id: "sigma", label: "Sigma", category: "cinema" },
  { id: "insta360", label: "Insta360", category: "action" },
  { id: "olympus", label: "OM System / Olympus", category: "mirrorless" },
  { id: "ricoh", label: "Ricoh", category: "action" },
  { id: "unknown", label: "不确定", category: "unknown" }
];

const workflowByType: Record<InputType, string> = {
  rec709: "当前素材可直接作为基础创意 LUT 测试输入，但仍建议先完成曝光和白平衡校正。",
  log: "当前素材为 Log / 宽色域素材，建议先在调色软件中用 CST、项目色彩管理或官方转换流程还原到 Rec.709，再叠加本工具导出的创意 LUT。",
  hdr: "当前素材可能属于 HDR 工作流，网页 SDR 预览和剪辑软件显示可能存在差异，建议先转换到标准显示空间后再测试本创意 LUT。",
  flat: "当前素材属于 Flat / 低对比风格配置，可先做基础对比、曝光和白平衡校正，再叠加本工具创意 LUT。",
  unknown: "如果不确定素材类型，建议先选择 Rec.709 工作流，或在调色软件中完成基础还原后再使用本创意 LUT。"
};

const warningByType: Record<InputType, string> = {
  rec709: "本 LUT 是基础创意风格 LUT，不是相机技术转换 LUT。",
  log: "请勿将本 LUT 当作 Log 技术转换 LUT 使用。请先完成 Log 到 Rec.709 / 标准显示空间的还原。",
  hdr: "HDR 到 SDR 的显示转换不在当前工具处理范围内，请先完成色彩管理转换。",
  flat: "Flat 素材通常仍需要基础校正，本 LUT 只负责创意风格方向。",
  unknown: "输入类型不确定时，请谨慎叠加 LUT，并先完成基础曝光、白平衡和色彩空间确认。"
};

const davinciTipByType: Record<InputType, string> = {
  rec709: "建议放在基础曝光 / 白平衡校正之后的独立节点上。",
  log: "建议节点顺序：基础校正 -> CST / 项目色彩管理 / 官方转换流程 -> 本创意 LUT -> 微调。",
  hdr: "建议先完成 HDR/SDR 或色彩管理转换，再作为创意 LUT 测试。",
  flat: "建议先补回基础对比和曝光，再把本 LUT 放在独立风格节点上。",
  unknown: "建议先确认素材来源，或在节点 1 完成基础还原后再加载本 LUT。"
};

const cinemaWorkflow =
  "建议在 DaVinci Resolve 中使用项目色彩管理、CST 或厂商官方转换流程还原到 Rec.709 / 标准显示空间后，再叠加本工具创意 LUT。";

const buildProfile = ({
  id,
  brandId,
  brand,
  brandLabel,
  modelFamily,
  label,
  gamma,
  gamut,
  inputType,
  category,
  dataStatus = "built-in",
  sourceStatus = "community-reference",
  canUseDirectly
}: ProfileInput): CameraProfile => {
  const isCinemaLog = category === "cinema" && inputType === "log";
  const recommendedWorkflow = isCinemaLog ? cinemaWorkflow : workflowByType[inputType];

  return {
    id,
    brandId,
    brand,
    brandLabel,
    modelFamily,
    label,
    gamma,
    gamut,
    inputType,
    category,
    recommendedWorkflow,
    canUseDirectly: canUseDirectly ?? inputType === "rec709",
    warning: dataStatus === "built-in" ? warningByType[inputType] : "该配置为工作流占位，后续需要导入官方数据确认。",
    davinciTip: isCinemaLog ? cinemaWorkflow : davinciTipByType[inputType],
    premiereTip: inputType === "log" ? "建议先完成 Log 到 Rec.709 的技术还原，再在 Lumetri Creative / Look 中使用本创意 LUT。" : "可作为创意 Look 测试使用，并根据素材适当降低强度。",
    finalCutTip: inputType === "log" ? "建议先用可靠转换流程还原到标准显示空间，再加载本创意 LUT。" : "可通过 LUT 工具作为风格滤镜测试。",
    exportNote:
      inputType === "log"
        ? "Convert Log to Rec.709 first, then apply this creative LUT."
        : inputType === "hdr"
          ? "Convert HDR to standard display space first, then test this creative LUT."
          : inputType === "flat"
            ? "Correct exposure, contrast, and white balance first, then apply this creative LUT."
            : inputType === "unknown"
              ? "Confirm input color space before applying this creative LUT."
              : "Creative LUT can be tested directly after basic exposure and white balance correction.",
    dataStatus,
    sourceStatus
  };
};

const p = buildProfile;

export const cameraProfiles: readonly CameraProfile[] = [
  p({ id: "generic-rec709", brandId: "generic", brand: "Generic", brandLabel: "通用", label: "Rec.709 / Standard", gamma: "Rec.709", gamut: "Rec.709", inputType: "rec709", category: "generic" }),
  p({ id: "generic-hlg", brandId: "generic", brand: "Generic", brandLabel: "通用", label: "HLG", gamma: "HLG", gamut: "Rec.2020", inputType: "hdr", category: "generic" }),
  p({ id: "generic-hdr-pq", brandId: "generic", brand: "Generic", brandLabel: "通用", label: "HDR PQ", gamma: "PQ", gamut: "Rec.2020", inputType: "hdr", category: "generic" }),
  p({ id: "generic-unknown", brandId: "generic", brand: "Generic", brandLabel: "通用", label: "Unknown / 不确定", gamma: "Unknown", gamut: "Unknown", inputType: "unknown", category: "generic", dataStatus: "placeholder", sourceStatus: "unknown" }),

  p({ id: "sony-slog3-sgamut3cine", brandId: "sony", brand: "Sony", brandLabel: "Sony", label: "S-Log3 / S-Gamut3.Cine", gamma: "S-Log3", gamut: "S-Gamut3.Cine", inputType: "log", category: "mirrorless" }),
  p({ id: "sony-slog3-sgamut3", brandId: "sony", brand: "Sony", brandLabel: "Sony", label: "S-Log3 / S-Gamut3", gamma: "S-Log3", gamut: "S-Gamut3", inputType: "log", category: "mirrorless" }),
  p({ id: "sony-slog2-sgamut", brandId: "sony", brand: "Sony", brandLabel: "Sony", label: "S-Log2 / S-Gamut", gamma: "S-Log2", gamut: "S-Gamut", inputType: "log", category: "mirrorless" }),
  p({ id: "sony-hlg", brandId: "sony", brand: "Sony", brandLabel: "Sony", label: "HLG", gamma: "HLG", gamut: "Rec.2020", inputType: "hdr", category: "mirrorless" }),
  p({ id: "sony-cine4", brandId: "sony", brand: "Sony", brandLabel: "Sony", label: "Cine4", gamma: "Cine4", gamut: "Rec.709", inputType: "flat", category: "mirrorless" }),
  p({ id: "sony-scinetone", brandId: "sony", brand: "Sony", brandLabel: "Sony", label: "S-Cinetone", gamma: "S-Cinetone", gamut: "Rec.709", inputType: "rec709", category: "mirrorless" }),

  p({ id: "canon-clog", brandId: "canon", brand: "Canon", brandLabel: "Canon", label: "C-Log", gamma: "C-Log", gamut: "Cinema Gamut", inputType: "log", category: "mirrorless" }),
  p({ id: "canon-clog2", brandId: "canon", brand: "Canon", brandLabel: "Canon", label: "C-Log2", gamma: "C-Log2", gamut: "Cinema Gamut", inputType: "log", category: "mirrorless" }),
  p({ id: "canon-clog3-cinema-gamut", brandId: "canon", brand: "Canon", brandLabel: "Canon", label: "C-Log3 / Cinema Gamut", gamma: "C-Log3", gamut: "Cinema Gamut", inputType: "log", category: "mirrorless" }),
  p({ id: "canon-wide-dr", brandId: "canon", brand: "Canon", brandLabel: "Canon", label: "Wide DR", gamma: "Wide DR", gamut: "Rec.709", inputType: "flat", category: "mirrorless" }),
  p({ id: "canon-709", brandId: "canon", brand: "Canon", brandLabel: "Canon", label: "Canon 709", gamma: "Canon 709", gamut: "Rec.709", inputType: "rec709", category: "mirrorless" }),

  p({ id: "dji-dlog", brandId: "dji", brand: "DJI", brandLabel: "DJI", label: "D-Log", gamma: "D-Log", gamut: "D-Gamut", inputType: "log", category: "drone" }),
  p({ id: "dji-dlogm", brandId: "dji", brand: "DJI", brandLabel: "DJI", label: "D-Log M", gamma: "D-Log M", gamut: "D-Gamut", inputType: "log", category: "drone" }),
  p({ id: "dji-dcinelike", brandId: "dji", brand: "DJI", brandLabel: "DJI", label: "D-Cinelike", gamma: "D-Cinelike", gamut: "Rec.709", inputType: "flat", category: "drone" }),
  p({ id: "dji-normal-rec709", brandId: "dji", brand: "DJI", brandLabel: "DJI", label: "Normal / Rec.709", gamma: "Normal", gamut: "Rec.709", inputType: "rec709", category: "drone" }),

  p({ id: "panasonic-vlog-vgamut", brandId: "panasonic", brand: "Panasonic", brandLabel: "Panasonic", label: "V-Log / V-Gamut", gamma: "V-Log", gamut: "V-Gamut", inputType: "log", category: "mirrorless" }),
  p({ id: "panasonic-vlog-l", brandId: "panasonic", brand: "Panasonic", brandLabel: "Panasonic", label: "V-Log L", gamma: "V-Log L", gamut: "V-Gamut", inputType: "log", category: "mirrorless" }),
  p({ id: "panasonic-cinelike-d", brandId: "panasonic", brand: "Panasonic", brandLabel: "Panasonic", label: "Cinelike D", gamma: "Cinelike D", gamut: "Rec.709", inputType: "flat", category: "mirrorless" }),
  p({ id: "panasonic-cinelike-v", brandId: "panasonic", brand: "Panasonic", brandLabel: "Panasonic", label: "Cinelike V", gamma: "Cinelike V", gamut: "Rec.709", inputType: "flat", category: "mirrorless" }),
  p({ id: "panasonic-hlg", brandId: "panasonic", brand: "Panasonic", brandLabel: "Panasonic", label: "HLG", gamma: "HLG", gamut: "Rec.2020", inputType: "hdr", category: "mirrorless" }),

  p({ id: "fujifilm-flog", brandId: "fujifilm", brand: "Fujifilm", brandLabel: "Fujifilm", label: "F-Log", gamma: "F-Log", gamut: "F-Gamut", inputType: "log", category: "mirrorless" }),
  p({ id: "fujifilm-flog2", brandId: "fujifilm", brand: "Fujifilm", brandLabel: "Fujifilm", label: "F-Log2", gamma: "F-Log2", gamut: "F-Gamut", inputType: "log", category: "mirrorless" }),
  p({ id: "fujifilm-eterna", brandId: "fujifilm", brand: "Fujifilm", brandLabel: "Fujifilm", label: "Eterna / Film Simulation", gamma: "Eterna", gamut: "Rec.709", inputType: "rec709", category: "mirrorless" }),
  p({ id: "fujifilm-hlg", brandId: "fujifilm", brand: "Fujifilm", brandLabel: "Fujifilm", label: "HLG", gamma: "HLG", gamut: "Rec.2020", inputType: "hdr", category: "mirrorless" }),

  p({ id: "nikon-nlog", brandId: "nikon", brand: "Nikon", brandLabel: "Nikon", label: "N-Log", gamma: "N-Log", gamut: "Rec.2020", inputType: "log", category: "mirrorless" }),
  p({ id: "nikon-flat", brandId: "nikon", brand: "Nikon", brandLabel: "Nikon", label: "Flat", gamma: "Flat", gamut: "Rec.709", inputType: "flat", category: "mirrorless" }),
  p({ id: "nikon-hlg", brandId: "nikon", brand: "Nikon", brandLabel: "Nikon", label: "HLG", gamma: "HLG", gamut: "Rec.2020", inputType: "hdr", category: "mirrorless" }),
  p({ id: "nikon-standard", brandId: "nikon", brand: "Nikon", brandLabel: "Nikon", label: "Standard", gamma: "Standard", gamut: "Rec.709", inputType: "rec709", category: "mirrorless" }),

  p({ id: "blackmagic-film-gen5", brandId: "blackmagic", brand: "Blackmagic", brandLabel: "Blackmagic", label: "BMD Film Gen 5", gamma: "BMD Film Gen 5", gamut: "Blackmagic Wide Gamut Gen 5", inputType: "log", category: "cinema" }),
  p({ id: "blackmagic-film-gen4", brandId: "blackmagic", brand: "Blackmagic", brandLabel: "Blackmagic", label: "BMD Film Gen 4", gamma: "BMD Film Gen 4", gamut: "Blackmagic Design Film", inputType: "log", category: "cinema" }),
  p({ id: "blackmagic-extended-video", brandId: "blackmagic", brand: "Blackmagic", brandLabel: "Blackmagic", label: "Extended Video", gamma: "Extended Video", gamut: "Rec.709", inputType: "rec709", category: "cinema" }),
  p({ id: "blackmagic-video-rec709", brandId: "blackmagic", brand: "Blackmagic", brandLabel: "Blackmagic", label: "Video / Rec.709", gamma: "Video", gamut: "Rec.709", inputType: "rec709", category: "cinema" }),

  p({ id: "gopro-gplog", brandId: "gopro", brand: "GoPro", brandLabel: "GoPro / Action Camera", label: "GP-Log", gamma: "GP-Log", gamut: "Wide Gamut", inputType: "log", category: "action" }),
  p({ id: "gopro-flat", brandId: "gopro", brand: "GoPro", brandLabel: "GoPro / Action Camera", label: "Flat", gamma: "Flat", gamut: "Rec.709", inputType: "flat", category: "action" }),
  p({ id: "gopro-protune-flat", brandId: "gopro", brand: "GoPro", brandLabel: "GoPro / Action Camera", label: "Protune Flat", gamma: "Protune Flat", gamut: "Rec.709", inputType: "flat", category: "action" }),
  p({ id: "gopro-standard", brandId: "gopro", brand: "GoPro", brandLabel: "GoPro / Action Camera", label: "Standard", gamma: "Standard", gamut: "Rec.709", inputType: "rec709", category: "action" }),

  p({ id: "apple-log", brandId: "apple", brand: "Apple", brandLabel: "Apple / Mobile", label: "Apple Log", gamma: "Apple Log", gamut: "Apple Wide Gamut", inputType: "log", category: "mobile" }),
  p({ id: "apple-hdr", brandId: "apple", brand: "Apple", brandLabel: "Apple / Mobile", label: "HDR", gamma: "HDR", gamut: "Display P3 / Rec.2020", inputType: "hdr", category: "mobile" }),
  p({ id: "apple-standard", brandId: "apple", brand: "Apple", brandLabel: "Apple / Mobile", label: "Standard", gamma: "Standard", gamut: "Display P3 / Rec.709", inputType: "rec709", category: "mobile" }),
  p({ id: "apple-cinematic-video", brandId: "apple", brand: "Apple", brandLabel: "Apple / Mobile", label: "Cinematic Video", gamma: "Cinematic Video", gamut: "Display P3", inputType: "rec709", category: "mobile" }),

  p({ id: "arri-logc3", brandId: "arri", brand: "ARRI", brandLabel: "ARRI", label: "LogC3", gamma: "LogC3", gamut: "ARRI Wide Gamut 3", inputType: "log", category: "cinema" }),
  p({ id: "arri-logc4", brandId: "arri", brand: "ARRI", brandLabel: "ARRI", label: "LogC4", gamma: "LogC4", gamut: "ARRI Wide Gamut 4", inputType: "log", category: "cinema" }),
  p({ id: "arri-awg3", brandId: "arri", brand: "ARRI", brandLabel: "ARRI", label: "ARRI Wide Gamut 3", gamma: "LogC3", gamut: "ARRI Wide Gamut 3", inputType: "log", category: "cinema" }),
  p({ id: "arri-awg4", brandId: "arri", brand: "ARRI", brandLabel: "ARRI", label: "ARRI Wide Gamut 4", gamma: "LogC4", gamut: "ARRI Wide Gamut 4", inputType: "log", category: "cinema" }),
  p({ id: "arri-rec709-look", brandId: "arri", brand: "ARRI", brandLabel: "ARRI", label: "Rec.709 Look", gamma: "Rec.709 Look", gamut: "Rec.709", inputType: "rec709", category: "cinema" }),

  p({ id: "red-redlogfilm", brandId: "red", brand: "RED", brandLabel: "RED", label: "REDLogFilm", gamma: "REDLogFilm", gamut: "REDColor", inputType: "log", category: "cinema" }),
  p({ id: "red-log3g10", brandId: "red", brand: "RED", brandLabel: "RED", label: "Log3G10", gamma: "Log3G10", gamut: "REDWideGamutRGB", inputType: "log", category: "cinema" }),
  p({ id: "red-wide-gamut", brandId: "red", brand: "RED", brandLabel: "RED", label: "REDWideGamutRGB", gamma: "Log3G10", gamut: "REDWideGamutRGB", inputType: "log", category: "cinema" }),
  p({ id: "red-ipp2", brandId: "red", brand: "RED", brandLabel: "RED", label: "IPP2", gamma: "IPP2 Output Transform", gamut: "REDWideGamutRGB", inputType: "log", category: "cinema" }),
  p({ id: "red-rec709", brandId: "red", brand: "RED", brandLabel: "RED", label: "Rec.709", gamma: "Rec.709", gamut: "Rec.709", inputType: "rec709", category: "cinema" }),

  p({ id: "kinefinity-kinelog", brandId: "kinefinity", brand: "Kinefinity", brandLabel: "Kinefinity", label: "KineLOG", gamma: "KineLOG", gamut: "KineGamut", inputType: "log", category: "cinema", dataStatus: "placeholder", sourceStatus: "official-needed" }),
  p({ id: "kinefinity-kinegamut", brandId: "kinefinity", brand: "Kinefinity", brandLabel: "Kinefinity", label: "KineGamut", gamma: "KineLOG", gamut: "KineGamut", inputType: "log", category: "cinema", dataStatus: "placeholder", sourceStatus: "official-needed" }),
  p({ id: "kinefinity-rec709", brandId: "kinefinity", brand: "Kinefinity", brandLabel: "Kinefinity", label: "Rec.709", gamma: "Rec.709", gamut: "Rec.709", inputType: "rec709", category: "cinema" }),

  p({ id: "zcam-zlog2", brandId: "zcam", brand: "Z CAM", brandLabel: "Z CAM", label: "Z-Log2", gamma: "Z-Log2", gamut: "Z-Gamut", inputType: "log", category: "cinema" }),
  p({ id: "zcam-zgamut", brandId: "zcam", brand: "Z CAM", brandLabel: "Z CAM", label: "Z-Gamut", gamma: "Z-Log2", gamut: "Z-Gamut", inputType: "log", category: "cinema" }),
  p({ id: "zcam-rec709", brandId: "zcam", brand: "Z CAM", brandLabel: "Z CAM", label: "Rec.709", gamma: "Rec.709", gamut: "Rec.709", inputType: "rec709", category: "cinema" }),

  p({ id: "leica-llog", brandId: "leica", brand: "Leica", brandLabel: "Leica", label: "L-Log", gamma: "L-Log", gamut: "Leica Gamut", inputType: "log", category: "mirrorless" }),
  p({ id: "leica-rec709", brandId: "leica", brand: "Leica", brandLabel: "Leica", label: "Rec.709", gamma: "Rec.709", gamut: "Rec.709", inputType: "rec709", category: "mirrorless" }),

  p({ id: "sigma-cinemadng-loglike", brandId: "sigma", brand: "Sigma", brandLabel: "Sigma", label: "CinemaDNG / Log-like", gamma: "CinemaDNG / Log-like", gamut: "Camera Native", inputType: "log", category: "cinema", dataStatus: "placeholder", sourceStatus: "official-needed" }),
  p({ id: "sigma-rec709", brandId: "sigma", brand: "Sigma", brandLabel: "Sigma", label: "Rec.709", gamma: "Rec.709", gamut: "Rec.709", inputType: "rec709", category: "cinema" }),

  p({ id: "insta360-ilog", brandId: "insta360", brand: "Insta360", brandLabel: "Insta360", label: "I-Log", gamma: "I-Log", gamut: "Wide Gamut", inputType: "log", category: "action" }),
  p({ id: "insta360-flat", brandId: "insta360", brand: "Insta360", brandLabel: "Insta360", label: "Flat", gamma: "Flat", gamut: "Rec.709", inputType: "flat", category: "action" }),
  p({ id: "insta360-standard", brandId: "insta360", brand: "Insta360", brandLabel: "Insta360", label: "Standard", gamma: "Standard", gamut: "Rec.709", inputType: "rec709", category: "action" }),

  p({ id: "olympus-flat", brandId: "olympus", brand: "OM System / Olympus", brandLabel: "OM System / Olympus", label: "Flat", gamma: "Flat", gamut: "Rec.709", inputType: "flat", category: "mirrorless" }),
  p({ id: "olympus-omlog-placeholder", brandId: "olympus", brand: "OM System / Olympus", brandLabel: "OM System / Olympus", label: "OM-Log", gamma: "OM-Log", gamut: "Camera Native", inputType: "log", category: "mirrorless", dataStatus: "placeholder", sourceStatus: "official-needed" }),
  p({ id: "olympus-standard", brandId: "olympus", brand: "OM System / Olympus", brandLabel: "OM System / Olympus", label: "Standard", gamma: "Standard", gamut: "Rec.709", inputType: "rec709", category: "mirrorless" }),

  p({ id: "ricoh-flat", brandId: "ricoh", brand: "Ricoh", brandLabel: "Ricoh", label: "Flat", gamma: "Flat", gamut: "Rec.709", inputType: "flat", category: "action" }),
  p({ id: "ricoh-standard", brandId: "ricoh", brand: "Ricoh", brandLabel: "Ricoh", label: "Standard", gamma: "Standard", gamut: "Rec.709", inputType: "rec709", category: "action" }),

  p({ id: "unknown-profile", brandId: "unknown", brand: "Unknown", brandLabel: "不确定", label: "Unknown / 不确定", gamma: "Unknown", gamut: "Unknown", inputType: "unknown", category: "unknown", dataStatus: "placeholder", sourceStatus: "unknown" })
];

export const defaultCameraProfile = cameraProfiles[0];

export const getProfilesByBrand = (brandId: CameraBrand): readonly CameraProfile[] => {
  return cameraProfiles.filter((profile) => profile.brandId === brandId);
};

export const getCameraProfileById = (profileId: string): CameraProfile => {
  return cameraProfiles.find((profile) => profile.id === profileId) ?? defaultCameraProfile;
};

export const toInputColorConfig = (profile: CameraProfile): InputColorConfig => ({
  brandId: profile.brandId,
  brand: profile.brand,
  brandLabel: profile.brandLabel,
  profileId: profile.id,
  inputType: profile.inputType,
  category: profile.category,
  gamma: profile.gamma,
  gamut: profile.gamut,
  recommendedWorkflow: profile.recommendedWorkflow,
  canUseCreativeLutDirectly: profile.canUseDirectly,
  dataStatus: profile.dataStatus,
  sourceStatus: profile.sourceStatus
});
