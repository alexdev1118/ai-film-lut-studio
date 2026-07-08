import { Button } from "../ui/Button";

interface ExportBarProps {
  readonly canExport: boolean;
  readonly onGenerate: () => void;
  readonly onExport: () => void;
  readonly isGenerating: boolean;
}

export const ExportBar = ({ canExport, onGenerate, onExport, isGenerating }: ExportBarProps) => {
  return (
    <div className="export-bar">
      <Button disabled={isGenerating} onClick={onGenerate}>
        {isGenerating ? "生成中..." : "生成仿色预览"}
      </Button>
      <Button disabled={!canExport || isGenerating} variant="secondary" onClick={onExport}>
        导出 LUT
      </Button>
    </div>
  );
};
