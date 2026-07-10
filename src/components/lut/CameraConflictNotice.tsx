import { AlertTriangle } from "lucide-react";
import type { CameraDataConflict } from "../../types/cameraData";

interface CameraConflictNoticeProps {
  readonly conflicts: readonly CameraDataConflict[];
}

export const CameraConflictNotice = ({ conflicts }: CameraConflictNoticeProps) => {
  const openConflicts = conflicts.filter((conflict) => conflict.status === "open");
  if (openConflicts.length === 0) return null;

  return (
    <div className="camera-conflict-notice" role="alert">
      <AlertTriangle aria-hidden="true" />
      <div>
        <strong>存在 {openConflicts.length} 个未解决数据冲突</strong>
        {openConflicts.map((conflict) => <span key={conflict.id}>{conflict.field}: {conflict.factIds.join(" / ")}</span>)}
      </div>
    </div>
  );
};
