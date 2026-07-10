import { FileSearch, ShieldAlert } from "lucide-react";
import { getCameraDataSourcesForModel } from "../../data/cameraDataSources";
import { getCameraVerifiedFactsForModel } from "../../data/cameraVerifiedFacts";
import type { CameraDataConfidenceLevel, CameraLutSupportProfile } from "../../types";

interface CameraDataStatusPanelProps {
  readonly profile: CameraLutSupportProfile;
}

const confidenceLabels: Record<CameraDataConfidenceLevel, string> = {
  "official-confirmed": "官方确认",
  "official-incomplete": "官方资料不完整",
  "community-consensus": "社区共识",
  experimental: "实验性",
  unknown: "未知"
};

const getLatestVerificationDate = (values: readonly (string | undefined)[]): string => {
  const dates = values.filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return dates.length > 0 ? dates.toSorted().at(-1) ?? "尚未验证" : "尚未验证";
};

export const CameraDataStatusPanel = ({ profile }: CameraDataStatusPanelProps) => {
  const sources = getCameraDataSourcesForModel(profile.brand, profile.modelName);
  const facts = getCameraVerifiedFactsForModel(profile.brand, profile.modelName);
  const officialSourceCount = sources.filter((source) => source.sourceType.startsWith("official-")).length;
  const officialFactCount = facts.filter((fact) => fact.confidence === "official-confirmed").length;
  const pendingFieldCount = sources.filter((source) => source.verificationStatus === "unverified" || source.verificationStatus === "partially-verified").length;
  const conflictingSourceCount = sources.filter((source) => source.verificationStatus === "conflicting").length;
  const latestVerificationDate = getLatestVerificationDate([
    profile.lastVerifiedAt,
    ...sources.map((source) => source.verifiedAt),
    ...facts.map((fact) => fact.lastVerifiedAt)
  ]);
  const effectiveConfidence = profile.dataStatus === "verified-official" && officialSourceCount === 0 ? "experimental" : profile.confidenceLevel;
  const firmwareScope = profile.firmwareScope?.join("、") ?? "尚未登记固件范围";

  return (
    <section aria-label="相机资料核验状态" className="camera-data-status-panel">
      <header>
        <span>
          <FileSearch aria-hidden="true" />
          资料核验状态
        </span>
        <strong>{confidenceLabels[effectiveConfidence]}</strong>
      </header>

      <div className="camera-data-status-grid">
        <p><span>官方资料数量</span><strong>{officialSourceCount}</strong></p>
        <p><span>已验证事实数量</span><strong>{officialFactCount}</strong></p>
        <p><span>待确认字段数量</span><strong>{pendingFieldCount > 0 ? pendingFieldCount : profile.officialSourceNeeded ? 1 : 0}</strong></p>
        <p><span>当前固件范围</span><strong title={firmwareScope}>{firmwareScope}</strong></p>
        <p><span>最近验证日期</span><strong>{latestVerificationDate}</strong></p>
        <p><span>资料状态</span><strong>{profile.dataStatus === "verified-official" && officialSourceCount > 0 ? "已完成官方核验" : "待官方确认"}</strong></p>
      </div>

      <p className="camera-data-status-warning">
        <ShieldAlert aria-hidden="true" />
        <span>当前机型尚未完成官方资料核验，仅可用于实验性导出。</span>
      </p>
      {conflictingSourceCount > 0 ? <p className="camera-data-status-conflict">检测到 {conflictingSourceCount} 条资料冲突，导出前请先完成人工核验。</p> : null}
    </section>
  );
};
