import type { CameraCommunityNote } from "../../types/cameraData";

interface CameraCommunityNotesProps {
  readonly notes: readonly CameraCommunityNote[];
}

export const CameraCommunityNotes = ({ notes }: CameraCommunityNotesProps) => (
  <div className="camera-community-notes">
    <strong>用户经验，不代表厂商官方建议。</strong>
    {notes.length === 0 ? <p>当前没有登记社区测试记录。</p> : notes.map((note) => (
      <article key={note.id}>
        <span>{note.firmware} · {note.logGamut} · {note.useCase}</span>
        <p>{note.recommendation}</p>
        <small>{note.monitoringConditions} · 独立来源 {note.independentSourceCount}</small>
      </article>
    ))}
  </div>
);
