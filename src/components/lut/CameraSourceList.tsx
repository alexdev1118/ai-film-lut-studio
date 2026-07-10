import { ExternalLink } from "lucide-react";
import type { CameraDatabaseSource } from "../../types/cameraData";

interface CameraSourceListProps {
  readonly sources: readonly CameraDatabaseSource[];
}

export const CameraSourceList = ({ sources }: CameraSourceListProps) => (
  <div className="camera-source-list">
    {sources.length === 0 ? <p>当前没有登记官方来源。</p> : sources.map((source) => (
      <article key={source.id}>
        <div>
          <strong>{source.documentTitle}</strong>
          <span>{source.publisher} · {source.sourceType} · {source.verificationStatus}</span>
        </div>
        <a href={source.sourceUrl} rel="noreferrer" target="_blank" title="打开官方来源">
          <ExternalLink aria-hidden="true" />
          来源
        </a>
        <p>{source.shortEvidenceSummary}</p>
      </article>
    ))}
  </div>
);
