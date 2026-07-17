import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { Download, FileCheck2, FlaskConical, Upload, X } from "lucide-react";
import { getColorEncodingProfile, getProfilesForContainer } from "../../data/colorEncodingProfiles";
import {
  loadRoundTripAsset,
  loadRoundTripCube,
  releaseRoundTripAsset,
  runRoundTripValidation,
  type LoadedRoundTripCube,
  type RoundTripLoadedAsset
} from "../../services/roundTripService";
import type { ColorEncodingProfileId, RoundTripAssetRole, RoundTripValidationResult } from "../../types";
import { downloadCalibrationChartPng } from "../../utils/calibrationChart";
import { LatestRequestGate } from "../../utils/latestRequestGate";
import { Button } from "../ui/Button";
import { SelectControl } from "../ui/SelectControl";

interface DaVinciRoundTripModalProps {
  readonly isOpen: boolean;
  readonly currentWorkspaceCubeHash?: string;
  readonly currentWorkspaceCubeName: string;
  readonly onClose: () => void;
}

const defaultProfileId: ColorEncodingProfileId = "bt709-g24-full";

const allowedRenderAccept = ".png,.tif,.tiff,.dpx,image/png,image/tiff,image/x-dpx";

const assetRoleLabel: Readonly<Record<RoundTripAssetRole, string>> = {
  pre: "A. PRE（加载创意 LUT 前）",
  post: "B. POST（加载当前 Cube 后）"
};

const verdictLabel: Readonly<Record<RoundTripValidationResult["diagnostic"]["verdict"], string>> = {
  validated: "数值验收通过",
  "pre-post-reversed": "PRE / POST 方向疑似反了",
  "different-frame": "不是同一帧，验收无效",
  "double-lut-suspected": "疑似重复套用 LUT",
  "wrong-or-stale-cube": "Cube 不是当前工作台版本",
  "profile-or-davinci-settings": "Profile 或 DaVinci 设置待排查",
  inconclusive: "证据不足，暂不下结论"
};

const profileOptionsFor = (asset: RoundTripLoadedAsset | null) => getProfilesForContainer(asset?.container ?? "dpx")
  .map((profile) => ({ value: profile.id, label: profile.displayName, description: profile.intendedUse }));

const formatBytes = (size: number): string => `${(size / 1024 / 1024).toFixed(size >= 1024 * 1024 ? 1 : 2)} MB`;

const AssetSummary = ({ asset }: { readonly asset: RoundTripLoadedAsset | null }) => {
  if (asset === null) {
    return <div className="roundtrip-empty">尚未上传静帧</div>;
  }

  return (
    <div className="roundtrip-asset-summary">
      <img alt={asset.name} src={asset.url} />
      <div>
        <strong title={asset.name}>{asset.name}</strong>
        <small>{asset.width} × {asset.height} · {formatBytes(asset.size)}</small>
        <small>{asset.container.toUpperCase()} · {asset.decodeStatus} · SHA-256 {asset.contentHash.slice(0, 12)}</small>
        {asset.dpx === undefined ? null : <small>DPX {asset.dpx.magicNumber} · {asset.dpx.endianness} · {asset.dpx.bitDepth}-bit · RGB{asset.dpx.channelOrder === "RGBA" ? "A" : ""} · Packing {asset.dpx.packing} · Encoding {asset.dpx.encoding}</small>}
      </div>
    </div>
  );
};

export const DaVinciRoundTripModal = ({ isOpen, currentWorkspaceCubeHash, currentWorkspaceCubeName, onClose }: DaVinciRoundTripModalProps) => {
  const requestGateRef = useRef(new LatestRequestGate());
  const assetRef = useRef<{ pre: RoundTripLoadedAsset | null; post: RoundTripLoadedAsset | null }>({ pre: null, post: null });
  const [pre, setPre] = useState<RoundTripLoadedAsset | null>(null);
  const [post, setPost] = useState<RoundTripLoadedAsset | null>(null);
  const [cube, setCube] = useState<LoadedRoundTripCube | null>(null);
  const [result, setResult] = useState<RoundTripValidationResult | null>(null);
  const [error, setError] = useState("");
  const [loadingRole, setLoadingRole] = useState<RoundTripAssetRole | "cube" | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isDownloadingChart, setIsDownloadingChart] = useState(false);

  const replaceAsset = (role: RoundTripAssetRole, next: RoundTripLoadedAsset | null): void => {
    releaseRoundTripAsset(assetRef.current[role]);
    assetRef.current[role] = next;
    if (role === "pre") {
      setPre(next);
      return;
    }
    setPost(next);
  };

  const clearLocalState = (): void => {
    replaceAsset("pre", null);
    replaceAsset("post", null);
    setCube(null);
    setResult(null);
    setError("");
  };

  const closeModal = (): void => {
    requestGateRef.current.begin();
    clearLocalState();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape" || document.querySelector('[role="listbox"]') !== null) {
        return;
      }
      event.preventDefault();
      closeModal();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => () => {
    requestGateRef.current.begin();
    releaseRoundTripAsset(assetRef.current.pre);
    releaseRoundTripAsset(assetRef.current.post);
  }, []);

  if (!isOpen) {
    return null;
  }

  const handleAssetFile = async (role: RoundTripAssetRole, event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file === undefined) {
      return;
    }
    const requestId = requestGateRef.current.begin();
    const profileId = role === "pre" ? pre?.profileId ?? defaultProfileId : post?.profileId ?? defaultProfileId;
    try {
      setLoadingRole(role);
      setError("");
      setResult(null);
      const loaded = await loadRoundTripAsset({ file, role, profileId });
      if (!requestGateRef.current.isCurrent(requestId)) {
        releaseRoundTripAsset(loaded);
        return;
      }
      replaceAsset(role, loaded);
    } catch (fileError) {
      if (!requestGateRef.current.isCurrent(requestId)) {
        return;
      }
      const message = fileError instanceof Error ? fileError.message : "DaVinci 静帧读取失败。";
      setError(message);
    } finally {
      if (requestGateRef.current.isCurrent(requestId)) {
        setLoadingRole(null);
      }
    }
  };

  const handleCubeFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file === undefined) {
      return;
    }
    const requestId = requestGateRef.current.begin();
    try {
      setLoadingRole("cube");
      setError("");
      setResult(null);
      const loaded = await loadRoundTripCube({ file, currentWorkspaceCubeHash });
      if (requestGateRef.current.isCurrent(requestId)) {
        setCube(loaded);
      }
    } catch (fileError) {
      if (!requestGateRef.current.isCurrent(requestId)) {
        return;
      }
      const message = fileError instanceof Error ? fileError.message : ".cube 读取失败。";
      setError(message);
    } finally {
      if (requestGateRef.current.isCurrent(requestId)) {
        setLoadingRole(null);
      }
    }
  };

  const updateAssetProfile = (role: RoundTripAssetRole, value: string): void => {
    const profile = getColorEncodingProfile(value);
    setResult(null);
    if (role === "pre") {
      const next = assetRef.current.pre === null ? null : { ...assetRef.current.pre, profileId: profile.id };
      assetRef.current.pre = next;
      setPre(next);
      return;
    }
    const next = assetRef.current.post === null ? null : { ...assetRef.current.post, profileId: profile.id };
    assetRef.current.post = next;
    setPost(next);
  };

  const handleRun = async (): Promise<void> => {
    if (pre === null || post === null || cube === null) {
      setError("请完整上传 PRE、POST 与实际套用的 Cube 文件后再运行验收。");
      return;
    }
    const requestId = requestGateRef.current.begin();
    try {
      setIsRunning(true);
      setError("");
      const validation = await runRoundTripValidation({ pre, post, cube });
      if (requestGateRef.current.isCurrent(requestId)) {
        setResult(validation);
      }
    } catch (validationError) {
      if (!requestGateRef.current.isCurrent(requestId)) {
        return;
      }
      const message = validationError instanceof Error ? validationError.message : "Round-trip 验收失败。";
      setError(message);
      setResult(null);
    } finally {
      if (requestGateRef.current.isCurrent(requestId)) {
        setIsRunning(false);
      }
    }
  };

  const handleDownloadChart = async (): Promise<void> => {
    try {
      setIsDownloadingChart(true);
      setError("");
      await downloadCalibrationChartPng();
    } catch (downloadError) {
      const message = downloadError instanceof Error ? downloadError.message : "校准图下载失败。";
      setError(message);
    } finally {
      setIsDownloadingChart(false);
    }
  };

  const handleBackdrop = (event: ReactMouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  };

  const cubeStatus = cube?.contract.currentWorkspaceCubeMatch === "matched"
    ? "与当前工作台导出记录匹配"
    : cube?.contract.currentWorkspaceCubeMatch === "mismatched"
      ? "与当前工作台导出记录不匹配"
      : "当前工作台没有可比对的 Cube Hash";

  return createPortal(
    <div className="roundtrip-modal-backdrop" role="presentation" onMouseDown={handleBackdrop}>
      <section aria-label="DaVinci Round-trip 数值验收" aria-modal="true" className="roundtrip-modal roundtrip-modal-v2" role="dialog">
        <header className="roundtrip-modal-header">
          <div>
            <span><FlaskConical aria-hidden="true" /> 数值验收</span>
            <h2>DaVinci PRE / POST 回读</h2>
            <p>仅接受同一时间线帧的实际 PRE、POST 与实际套用的 Cube。网页工作台目标图不会自动充当 PRE。</p>
          </div>
          <button aria-label="关闭 DaVinci Round-trip 验收" type="button" onClick={closeModal}><X aria-hidden="true" /></button>
        </header>

        <div className="roundtrip-modal-body">
          <section className="roundtrip-workflow-card">
            <h3>固定验收顺序</h3>
            <ol>
              <li>导出同一帧 PRE：创意 LUT 节点之前，无截图、无 JPEG。</li>
              <li>导出同一帧 POST：仅比 PRE 多当前 Cube，节点 Key Output 保持 1.000。</li>
              <li>上传 DaVinci 节点实际使用的 Cube，再选择 PRE 与 POST 的受控编码 Profile。</li>
            </ol>
            <p>不要把已经套 LUT 的 POST 再作为网页目标图；不要以 Viewer 截图做数值校准。</p>
            <Button disabled={isDownloadingChart} variant="ghost" onClick={() => void handleDownloadChart()}>
              <Download aria-hidden="true" />
              {isDownloadingChart ? "正在生成..." : "下载校准测试图 PNG"}
            </Button>
          </section>

          <div className="roundtrip-slot-grid">
            {(["pre", "post"] as const).map((role) => {
              const asset = role === "pre" ? pre : post;
              return (
                <section className="roundtrip-slot" key={role}>
                  <h3>{assetRoleLabel[role]}</h3>
                  <AssetSummary asset={asset} />
                  <label className="roundtrip-file-button">
                    <Upload aria-hidden="true" />
                    {loadingRole === role ? "正在读取..." : "上传 PNG / TIFF / DPX"}
                    <input accept={allowedRenderAccept} disabled={loadingRole !== null} type="file" onChange={(event) => void handleAssetFile(role, event)} />
                  </label>
                  <SelectControl
                    label={role === "pre" ? "PRE 输入 Profile" : "POST DaVinci 输出 Profile"}
                    options={profileOptionsFor(asset)}
                    value={asset?.profileId ?? defaultProfileId}
                    onChange={(value) => updateAssetProfile(role, value)}
                  />
                  <p className="roundtrip-profile-note">{getColorEncodingProfile(asset?.profileId ?? defaultProfileId).warning}</p>
                </section>
              );
            })}
          </div>

          <section className="roundtrip-cube-slot">
            <div>
              <h3>C. 实际套用的 .cube</h3>
              <p>当前工作台导出名：{currentWorkspaceCubeName}</p>
            </div>
            {cube === null ? <div className="roundtrip-empty">尚未上传实际 Cube</div> : (
              <div className="roundtrip-cube-summary">
                <FileCheck2 aria-hidden="true" />
                <div>
                  <strong title={cube.contract.fileName}>{cube.contract.fileName}</strong>
                  <small>{cube.contract.title ?? "无 TITLE"} · {cube.contract.lutSize} 点 · {cube.contract.dataLineCount} 行 · SHA-256 {cube.contract.contentHash.slice(0, 12)}</small>
                  <small>{cubeStatus}</small>
                  <small>{cube.contract.inputContract ?? "未声明 Input Contract"} → {cube.contract.outputContract ?? "未声明 Output Contract"} · Range {cube.contract.range ?? "未声明"} · Technical {cube.contract.technicalConversionIncluded ?? "未声明"}</small>
                </div>
              </div>
            )}
            <label className="roundtrip-file-button">
              <Upload aria-hidden="true" />
              {loadingRole === "cube" ? "正在校验 Cube..." : "上传实际 .cube"}
              <input accept=".cube,text/plain" disabled={loadingRole !== null} type="file" onChange={(event) => void handleCubeFile(event)} />
            </label>
          </section>

          {error.length === 0 ? null : <p className="roundtrip-error" role="alert">{error}</p>}
          <Button disabled={isRunning || loadingRole !== null || pre === null || post === null || cube === null} onClick={() => void handleRun()}>
            {isRunning ? "正在执行同帧与双方向比较..." : "运行 PRE / POST 数值验收"}
          </Button>

          {result === null ? null : (
            <section className={result.diagnostic.verdict === "validated" ? "roundtrip-result passed" : "roundtrip-result warning"}>
              <header><strong>{verdictLabel[result.diagnostic.verdict]}</strong><span>{result.diagnostic.isWebsiteAlgorithmBug === "proven" ? "网页问题已证实" : "需按证据排查"}</span></header>
              <p className="roundtrip-verdict">{result.diagnostic.chineseConclusion}</p>
              <div className="roundtrip-metrics">
                <p><span>同帧状态</span><strong>{result.sameFrame.status}</strong></p>
                <p><span>边缘误差 / 相似度</span><strong>{result.sameFrame.edgeMeanAbsoluteError?.toFixed(6) ?? "-"} / {result.sameFrame.edgeStructureSimilarity?.toFixed(6) ?? "-"}</strong></p>
                <p><span>PRE → POST RGB MAE</span><strong>{result.preToPost?.comparison.rgbMeanAbsoluteError.toFixed(6) ?? "-"}</strong></p>
                <p><span>PRE → POST P95 / Max</span><strong>{result.preToPost === undefined ? "-" : `${result.preToPost.comparison.p95Error.toFixed(6)} / ${result.preToPost.comparison.maximumError.toFixed(6)}`}</strong></p>
                <p><span>POST → PRE RGB MAE</span><strong>{result.postToPre?.comparison.rgbMeanAbsoluteError.toFixed(6) ?? "-"}</strong></p>
                <p><span>两次 Cube RGB MAE</span><strong>{result.doubleLutComparison?.rgbMeanAbsoluteError.toFixed(6) ?? "-"}</strong></p>
              </div>
              {result.diagnostic.signals.map((signal) => <p className="roundtrip-result-note" key={signal}>{signal}</p>)}
              <ol className="roundtrip-next-actions">
                {result.diagnostic.nextActions.map((action) => <li key={action}>{action}</li>)}
              </ol>
            </section>
          )}
        </div>
      </section>
    </div>,
    document.body
  );
};
