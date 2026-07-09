import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import { Film, Pause, Play, Scissors, X } from "lucide-react";
import type { CapturedFrame, VideoSource } from "../../types";
import { captureVideoFrame, createVideoObjectUrl, getVideoMetadata, validateVideoFile } from "../../utils/videoFrame";
import { formatFileSize } from "../../utils/image";
import { Button } from "../ui/Button";

type VideoFrameStatus = "idle" | "loading" | "metadata" | "ready" | "unsupported" | "error" | "capturing" | "captured";

interface VideoFrameCaptureModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onCapture: (frame: CapturedFrame) => void;
}

const formatDuration = (seconds: number): string => {
  const safeSeconds = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const createInitialVideoSource = (file: File, url: string): VideoSource => {
  return {
    file,
    url,
    name: file.name,
    size: file.size,
    type: file.type.trim().length > 0 ? file.type : "video/mp4",
    duration: 0,
    width: 0,
    height: 0
  };
};

const getStatusLabel = (status: VideoFrameStatus): string => {
  switch (status) {
    case "loading":
      return "正在读取本地视频...";
    case "metadata":
      return "正在读取视频时长与分辨率...";
    case "ready":
      return "视频已就绪，可拖动时间轴并截取当前帧。";
    case "unsupported":
      return "读取时间较长，可能是视频较大、10bit/12bit、Log 素材，或当前浏览器不支持内部编码。";
    case "error":
      return "视频读取失败，当前浏览器可能无法解码该视频。";
    case "capturing":
      return "正在截取当前帧...";
    case "captured":
      return "截取成功。";
    case "idle":
    default:
      return "未选择视频。";
  }
};

const getCodecSupportHint = (file: File): string => {
  const type = file.type.trim().length > 0 ? file.type : "未知 MIME";
  const lowerName = file.name.toLowerCase();
  const isMovLike = lowerName.endsWith(".mov") || lowerName.endsWith(".m4v") || type.includes("quicktime");

  if (isMovLike) {
    return "MOV 是容器格式，能否预览取决于内部编码；H.265 / HEVC、ProRes、10bit/12bit、Log 或相机原始素材可能无法在浏览器中直接解码。";
  }

  return "视频抽帧依赖浏览器本地解码能力；推荐 MP4 容器、H.264 编码、8bit / 普通 Rec.709 视频。";
};

export const VideoFrameCaptureModal = ({ isOpen, onClose, onCapture }: VideoFrameCaptureModalProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const [source, setSource] = useState<VideoSource | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState<VideoFrameStatus>("idle");
  const [supportHint, setSupportHint] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const slowReadTimerRef = useRef<number | undefined>(undefined);

  const clearSlowReadTimer = () => {
    if (slowReadTimerRef.current !== undefined) {
      window.clearTimeout(slowReadTimerRef.current);
      slowReadTimerRef.current = undefined;
    }
  };

  const resetVideoSource = () => {
    clearSlowReadTimer();

    if (sourceUrlRef.current !== null) {
      URL.revokeObjectURL(sourceUrlRef.current);
      sourceUrlRef.current = null;
    }

    setSource(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setIsCapturing(false);
    setStatus("idle");
    setSupportHint("");
    setErrorMessage("");
  };

  const closeModal = () => {
    resetVideoSource();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      clearSlowReadTimer();
      if (sourceUrlRef.current !== null) {
        URL.revokeObjectURL(sourceUrlRef.current);
        sourceUrlRef.current = null;
      }
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.currentTarget === event.target) {
      closeModal();
    }
  };

  const handleVideoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (file === undefined) {
      return;
    }

    try {
      validateVideoFile(file);
      const url = createVideoObjectUrl(file);
      resetVideoSource();
      sourceUrlRef.current = url;
      setSource(createInitialVideoSource(file, url));
      setStatus("loading");
      setSupportHint(getCodecSupportHint(file));
      setErrorMessage("");
      slowReadTimerRef.current = window.setTimeout(() => {
        setStatus((current) => (current === "loading" || current === "metadata" ? "unsupported" : current));
      }, 10000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "视频读取失败，请更换视频文件或先导出静帧。";
      setStatus("error");
      setErrorMessage(message);
    }
  };

  const handleLoadStart = () => {
    if (source !== null) {
      setStatus("loading");
    }
  };

  const handleLoadedMetadata = () => {
    try {
      setStatus("metadata");
      const videoElement = videoRef.current;

      if (videoElement === null) {
        throw new Error("视频读取失败，请更换视频文件或先导出静帧。");
      }

      const metadata = getVideoMetadata(videoElement);
      setDuration(metadata.duration);
      setCurrentTime(videoElement.currentTime);
      setSource((current) => (current === null ? current : { ...current, duration: metadata.duration, width: metadata.width, height: metadata.height }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "视频读取失败，请更换视频文件或先导出静帧。";
      setStatus("error");
      setErrorMessage(message);
    }
  };

  const handleCanPlay = () => {
    clearSlowReadTimer();
    setStatus("ready");
    setErrorMessage("");
  };

  const handleVideoError = () => {
    clearSlowReadTimer();
    setStatus("error");
    setErrorMessage("如果视频无法预览，这通常不是上传失败，而是浏览器无法解码该视频。请尝试 MP4 H.264，或先在剪辑软件中导出静帧。");
  };

  const handleTimeUpdate = () => {
    const videoElement = videoRef.current;

    if (videoElement === null) {
      return;
    }

    setCurrentTime(videoElement.currentTime);
    setIsPlaying(!videoElement.paused && !videoElement.ended);
  };

  const handleSeek = (nextTime: number) => {
    const videoElement = videoRef.current;

    if (videoElement === null) {
      return;
    }

    videoElement.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleTogglePlayback = async () => {
    const videoElement = videoRef.current;

    if (videoElement === null) {
      return;
    }

    try {
      if (videoElement.paused || videoElement.ended) {
        await videoElement.play();
        setIsPlaying(true);
        return;
      }

      videoElement.pause();
      setIsPlaying(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "视频播放失败，请更换视频文件。";
      setStatus("error");
      setErrorMessage(message);
    }
  };

  const handleCapture = async () => {
    const videoElement = videoRef.current;

    if (videoElement === null || source === null) {
      setErrorMessage("请先选择视频文件。");
      return;
    }

    try {
      setIsCapturing(true);
      setStatus("capturing");
      setErrorMessage("");
      const capturedFrame = await captureVideoFrame(videoElement, { sourceVideoName: source.name });
      setStatus("captured");
      onCapture(capturedFrame);
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "当前帧截取失败，请调整时间点后重试。";
      setStatus("error");
      setErrorMessage(message);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="video-frame-modal-backdrop" role="presentation" onMouseDown={handleBackdropClick}>
      <section className="video-frame-modal" aria-label="视频抽帧为目标静帧" role="dialog" aria-modal="true">
        <header className="video-frame-modal-header">
          <div>
            <span className="video-frame-kicker">
              <Film aria-hidden="true" />
              视频抽帧
            </span>
            <h2>截取当前帧为目标静帧</h2>
          </div>
          <button className="video-frame-close" aria-label="关闭视频抽帧" type="button" onClick={closeModal}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="video-frame-modal-body">
          <label className="video-file-picker">
            <span>选择视频文件</span>
            <small>支持 MP4 / MOV / WebM / M4V 容器；推荐 MP4 H.264、8bit / 普通 Rec.709。H.265 / ProRes / 10bit / Log / 相机原始素材可能受浏览器解码能力限制。</small>
            <input accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v" type="file" onChange={handleVideoFileChange} />
          </label>

          <div className={`video-status-panel ${status}`.trim()}>
            <div>
              <strong>{getStatusLabel(status)}</strong>
              {supportHint.length > 0 ? <span>{supportHint}</span> : null}
            </div>
            {status === "loading" || status === "metadata" || status === "unsupported" ? <span className="video-progress-bar" /> : null}
          </div>

          {errorMessage.length > 0 ? <p className="video-frame-error">{errorMessage}</p> : null}

          <div className="video-workflow-advice">
            <strong>推荐替代流程</strong>
            <ol>
              <li>换用 MP4 容器、H.264 编码的视频。</li>
              <li>在 DaVinci / Premiere / 剪映专业版 / 相机软件中导出当前帧为 JPG、PNG 或 TIFF。</li>
              <li>回到目标素材箱，使用“选择图片”上传这张静帧，再继续生成创意 LUT。</li>
            </ol>
          </div>

          <div className="video-frame-preview">
            {source === null ? (
              <div className="video-frame-empty">
                <Film aria-hidden="true" />
                <span>选择视频后在这里预览并截取当前帧</span>
              </div>
            ) : (
              <video
                ref={videoRef}
                controls={false}
                playsInline
                preload="metadata"
                src={source.url}
                onCanPlay={handleCanPlay}
                onEnded={() => setIsPlaying(false)}
                onError={handleVideoError}
                onLoadedMetadata={handleLoadedMetadata}
                onLoadStart={handleLoadStart}
                onTimeUpdate={handleTimeUpdate}
              />
            )}
          </div>

          <div className="video-frame-controls">
            <button className="video-play-button" disabled={source === null || status === "error"} type="button" onClick={handleTogglePlayback}>
              {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              {isPlaying ? "暂停" : "播放"}
            </button>
            <input
              aria-label="拖动视频时间"
              disabled={source === null || duration <= 0 || status === "error"}
              max={duration}
              min={0}
              step={0.01}
              type="range"
              value={Math.min(currentTime, duration)}
              onChange={(event) => handleSeek(Number(event.currentTarget.value))}
            />
            <span className="video-timecode">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          </div>

          {source === null ? null : (
            <div className="video-source-meta">
              <span title={source.name}>{source.name}</span>
              <span>MIME：{source.type || "未知"}</span>
              <span>大小：{formatFileSize(source.size)}</span>
              <span>分辨率：{source.width > 0 && source.height > 0 ? `${source.width}x${source.height}` : "读取中"}</span>
              <span>时长：{formatDuration(duration)}</span>
              <span>当前：{formatDuration(currentTime)}</span>
            </div>
          )}
        </div>

        <footer className="video-frame-modal-footer">
          <Button variant="ghost" onClick={closeModal}>
            取消
          </Button>
          <Button disabled={source === null || isCapturing} onClick={handleCapture}>
            <Scissors aria-hidden="true" />
            {isCapturing ? "正在截取..." : "截取当前帧"}
          </Button>
        </footer>
      </section>
    </div>
  );
};
