import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, X } from "lucide-react";
import { generateLutFileName, sanitizeLutName } from "../../utils/lutNaming";
import { Button } from "../ui/Button";

interface CustomLutNameModalProps {
  readonly isOpen: boolean;
  readonly automaticName: string;
  readonly customName: string;
  readonly onClose: () => void;
  readonly onSave: (value: string) => void;
}

export const CustomLutNameModal = ({ isOpen, automaticName, customName, onClose, onSave }: CustomLutNameModalProps) => {
  const [draftName, setDraftName] = useState(customName);

  useEffect(() => {
    setDraftName(customName);
  }, [customName]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.currentTarget === event.target) {
      onClose();
    }
  };

  const resolvedDraftName = sanitizeLutName(draftName);
  const previewName = draftName.trim().length > 0 ? generateLutFileName(resolvedDraftName) : generateLutFileName(automaticName);
  const isAutomaticNaming = draftName.trim().length === 0;

  const handleRestoreAutomatic = () => {
    setDraftName("");
  };

  const handleSave = () => {
    onSave(draftName.trim().length > 0 ? resolvedDraftName : "");
    onClose();
  };

  return createPortal(
    <div className="custom-lut-name-modal-backdrop" role="presentation" onMouseDown={handleBackdropClick}>
      <section aria-label="高级自定义文件名" aria-modal="true" className="custom-lut-name-modal" role="dialog">
        <header className="custom-lut-name-modal-header">
          <div>
            <span>POST 创意 LUT</span>
            <h2>高级自定义文件名</h2>
          </div>
          <button aria-label="关闭高级自定义文件名" type="button" onClick={onClose}><X aria-hidden="true" /></button>
        </header>

        <div className="custom-lut-name-modal-body">
          <div className="custom-lut-name-automatic">
            <span>当前自动文件名</span>
            <strong title={generateLutFileName(automaticName)}>{generateLutFileName(automaticName)}</strong>
          </div>
          <label>
            <span>自定义文件名主体</span>
            <input
              autoFocus
              placeholder={automaticName}
              value={draftName}
              onChange={(event) => setDraftName(sanitizeLutName(event.currentTarget.value))}
            />
          </label>
          <div className="custom-lut-name-mode">
            <span>当前模式</span>
            <strong>{isAutomaticNaming ? "自动命名" : "自定义命名"}</strong>
          </div>
          <div className="custom-lut-name-preview">
            <span>导出文件名预览</span>
            <strong title={previewName}>{previewName}</strong>
          </div>
        </div>

        <footer className="custom-lut-name-modal-footer">
          <Button variant="ghost" onClick={handleRestoreAutomatic}><RotateCcw aria-hidden="true" />恢复自动命名</Button>
          <div>
            <Button variant="ghost" onClick={onClose}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </div>
        </footer>
      </section>
    </div>,
    document.body
  );
};
