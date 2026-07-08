import type { ChangeEvent, ReactNode } from "react";

interface UploadPanelProps {
  readonly title: string;
  readonly description: string;
  readonly className?: string;
  readonly fileName?: string;
  readonly accept?: string;
  readonly icon?: ReactNode;
  readonly inputMode?: "file" | "text";
  readonly onFileChange?: (file: File) => void;
  readonly onFileNameChange?: (fileName: string) => void;
}

export const UploadPanel = ({
  title,
  description,
  className = "",
  fileName = "",
  accept = "image/jpeg,image/png,image/webp,image/tiff,.jpg,.jpeg,.png,.webp,.tif,.tiff",
  icon,
  inputMode = "text",
  onFileChange,
  onFileNameChange
}: UploadPanelProps) => {
  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (selectedFile === undefined) {
      return;
    }

    onFileChange?.(selectedFile);
  };

  return (
    <label className={`upload-panel ${className}`.trim()}>
      {icon}
      <span className="upload-title">{title}</span>
      <span className="upload-description">{description}</span>
      {inputMode === "file" ? (
        <>
          <input aria-label={title} accept={accept} type="file" onChange={handleFileInputChange} />
          {fileName.length > 0 ? <span className="upload-file-name">{fileName}</span> : null}
        </>
      ) : (
        <input
          aria-label={title}
          type="text"
          value={fileName}
          onChange={(event) => onFileNameChange?.(event.currentTarget.value)}
        />
      )}
    </label>
  );
};
