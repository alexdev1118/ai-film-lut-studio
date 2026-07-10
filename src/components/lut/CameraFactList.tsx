import type { CameraDatabaseFact } from "../../types/cameraData";

interface CameraFactListProps {
  readonly facts: readonly CameraDatabaseFact[];
}

const formatFactValue = (value: CameraDatabaseFact["value"]): string => Array.isArray(value) ? value.join(" / ") : String(value);

export const CameraFactList = ({ facts }: CameraFactListProps) => (
  <div className="camera-fact-list">
    {facts.length === 0 ? <p>当前没有已关联来源的事实。</p> : facts.map((fact) => (
      <article key={fact.id}>
        <span>{fact.category}</span>
        <strong>{fact.field}: {formatFactValue(fact.value)}{fact.unit === undefined ? "" : ` ${fact.unit}`}</strong>
        <small>{fact.shortEvidenceSummary}</small>
      </article>
    ))}
  </div>
);
