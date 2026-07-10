import { FileSearch, ShieldAlert } from "lucide-react";
import { getCameraDataSourcesForModel } from "../../data/cameraDataSources";
import { getCameraVerifiedFactsForModel } from "../../data/cameraVerifiedFacts";
import { cameraDatabase, getCameraCoverageStatus, getCameraFacts, getCameraModelRecord, getCameraSources } from "../../data/camera-db";
import type { CameraDataConfidenceLevel, CameraLutSupportProfile } from "../../types";
import { CameraCommunityNotes } from "./CameraCommunityNotes";
import { CameraConflictNotice } from "./CameraConflictNotice";
import { CameraFactList } from "./CameraFactList";
import { CameraProfileInspector } from "./CameraProfileInspector";
import { CameraSourceList } from "./CameraSourceList";

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
  const databaseModel = getCameraModelRecord(profile.id);
  const databaseSources = getCameraSources(profile.id);
  const databaseFacts = getCameraFacts(profile.id);
  const databaseCoverage = getCameraCoverageStatus(profile.id);
  const databaseNotes = cameraDatabase.communityNotes.filter((note) => note.modelId === profile.id);
  const databaseConflicts = cameraDatabase.conflicts.filter((conflict) => conflict.modelId === profile.id);
  const sources = getCameraDataSourcesForModel(profile.brand, profile.modelName);
  const facts = getCameraVerifiedFactsForModel(profile.brand, profile.modelName);
  const officialSourceCount = databaseModel === undefined ? sources.filter((source) => source.sourceType.startsWith("official-")).length : databaseCoverage.officialSourceCount;
  const officialFactCount = databaseModel === undefined ? facts.filter((fact) => fact.confidence === "official-confirmed").length : databaseCoverage.verifiedFactCount;
  const communityNoteCount = databaseModel === undefined ? 0 : databaseCoverage.communityNoteCount;
  const pendingFieldCount = sources.filter((source) => source.verificationStatus === "unverified" || source.verificationStatus === "partially-verified").length;
  const conflictingSourceCount = sources.filter((source) => source.verificationStatus === "conflicting").length;
  const latestVerificationDate = getLatestVerificationDate([
    profile.lastVerifiedAt,
    ...sources.map((source) => source.verifiedAt),
    ...facts.map((fact) => fact.lastVerifiedAt),
    ...databaseSources.map((source) => source.accessedAt),
    ...databaseFacts.map((fact) => fact.lastVerifiedAt)
  ]);
  const effectiveConfidence = databaseModel?.confidenceLevel ?? (profile.dataStatus === "verified-official" && officialSourceCount === 0 ? "experimental" : profile.confidenceLevel);
  const firmwareScope = databaseModel?.firmwareScope.map((scope) => scope.minVersion ?? scope.exactVersions?.join(" / ") ?? "未知").join("、") ?? profile.firmwareScope?.join("、") ?? "尚未登记固件范围";
  const unresolvedFieldCount = databaseModel?.unresolvedFields.length ?? (pendingFieldCount > 0 ? pendingFieldCount : profile.officialSourceNeeded ? 1 : 0);
  const coverageStateLabel =
    databaseModel === undefined
      ? "待官方确认"
      : databaseCoverage.coverageState === "verified"
        ? "已完成当前字段核验"
        : databaseCoverage.coverageState === "conflicting"
          ? "存在冲突"
          : databaseCoverage.coverageState === "partial"
            ? "部分核验"
            : "待官方确认";

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
        <p><span>社区资料数量</span><strong>{communityNoteCount}</strong></p>
        <p><span>待确认字段数量</span><strong>{unresolvedFieldCount}</strong></p>
        <p><span>当前固件范围</span><strong title={firmwareScope}>{firmwareScope}</strong></p>
        <p><span>最近验证日期</span><strong>{latestVerificationDate}</strong></p>
        <p><span>资料状态</span><strong>{coverageStateLabel}</strong></p>
      </div>

      <p className="camera-data-status-warning">
        <ShieldAlert aria-hidden="true" />
        <span>{databaseCoverage.technicalTransformAllowed ? "当前目录已登记可核验技术 LUT 元数据，仍需核对本地文件。" : "当前机型尚未完成技术转换文件核验，仅可用于实验性导出。"}</span>
      </p>
      {conflictingSourceCount > 0 ? <p className="camera-data-status-conflict">检测到 {conflictingSourceCount} 条资料冲突，导出前请先完成人工核验。</p> : null}
      <CameraConflictNotice conflicts={databaseConflicts} />
      {databaseModel === undefined ? null : (
        <details className="camera-data-details">
          <summary>查看完整资料与来源</summary>
          <div className="camera-data-details-body">
            <CameraProfileInspector model={databaseModel} />
            <section><h3>已关联事实</h3><CameraFactList facts={databaseFacts} /></section>
            <section><h3>官方来源</h3><CameraSourceList sources={databaseSources} /></section>
            <section><h3>社区备注</h3><CameraCommunityNotes notes={databaseNotes} /></section>
          </div>
        </details>
      )}
    </section>
  );
};
