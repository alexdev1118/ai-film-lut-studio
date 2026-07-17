const CHART_WIDTH = 1920;
const CHART_HEIGHT = 1080;

const getContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("浏览器无法创建校准图 Canvas 上下文。");
  }
  return context;
};

const drawLabel = (context: CanvasRenderingContext2D, text: string, x: number, y: number): void => {
  context.fillStyle = "#f8fafc";
  context.font = "600 22px system-ui, sans-serif";
  context.fillText(text, x, y);
};

const drawRamp = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  start: readonly [number, number, number],
  end: readonly [number, number, number]
): void => {
  const gradient = context.createLinearGradient(x, y, x + width, y);
  gradient.addColorStop(0, `rgb(${start[0]} ${start[1]} ${start[2]})`);
  gradient.addColorStop(1, `rgb(${end[0]} ${end[1]} ${end[2]})`);
  context.fillStyle = gradient;
  context.fillRect(x, y, width, height);
};

const drawPatchRow = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  colors: readonly string[]
): void => {
  const patchWidth = width / colors.length;
  colors.forEach((color, index) => {
    context.fillStyle = color;
    context.fillRect(x + patchWidth * index, y, patchWidth + 1, height);
  });
};

export const createCalibrationChartCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = CHART_WIDTH;
  canvas.height = CHART_HEIGHT;
  const context = getContext(canvas);
  context.fillStyle = "#080b10";
  context.fillRect(0, 0, CHART_WIDTH, CHART_HEIGHT);

  context.fillStyle = "#f8fafc";
  context.font = "700 32px system-ui, sans-serif";
  context.fillText("AI Film LUT Studio - DaVinci Round-Trip Calibration", 72, 58);
  context.font = "400 18px system-ui, sans-serif";
  context.fillStyle = "#94a3b8";
  context.fillText("PNG / sRGB Full - do not use a Viewer screenshot for numeric calibration", 72, 88);

  drawLabel(context, "Neutral ramp", 72, 138);
  drawRamp(context, 72, 158, 1776, 96, [0, 0, 0], [255, 255, 255]);

  drawLabel(context, "RGB ramps", 72, 304);
  drawRamp(context, 72, 324, 560, 72, [0, 0, 0], [255, 0, 0]);
  drawRamp(context, 680, 324, 560, 72, [0, 0, 0], [0, 255, 0]);
  drawRamp(context, 1288, 324, 560, 72, [0, 0, 0], [0, 0, 255]);

  drawLabel(context, "Primaries / secondaries", 72, 446);
  drawPatchRow(context, 72, 466, 840, 110, ["#ff0000", "#00ff00", "#0000ff", "#00ffff", "#ff00ff", "#ffff00"]);
  drawLabel(context, "Neutral / skin reference patches", 984, 446);
  drawPatchRow(context, 984, 466, 864, 110, ["#202020", "#606060", "#808080", "#c0c0c0", "#f0c3a5", "#c9876a", "#8f5a44", "#f8f8f8"]);

  drawLabel(context, "Saturation steps", 72, 626);
  drawPatchRow(context, 72, 646, 1776, 104, [
    "hsl(0 0% 50%)", "hsl(0 20% 50%)", "hsl(0 40% 50%)", "hsl(0 60% 50%)", "hsl(0 80% 50%)", "hsl(0 100% 50%)",
    "hsl(210 0% 50%)", "hsl(210 20% 50%)", "hsl(210 40% 50%)", "hsl(210 60% 50%)", "hsl(210 80% 50%)", "hsl(210 100% 50%)"
  ]);

  drawLabel(context, "Shadow and highlight color gradients", 72, 800);
  drawRamp(context, 72, 820, 568, 110, [0, 0, 0], [110, 24, 24]);
  drawRamp(context, 676, 820, 568, 110, [0, 0, 0], [24, 86, 110]);
  drawRamp(context, 1280, 820, 568, 110, [12, 12, 12], [255, 244, 220]);

  context.strokeStyle = "#334155";
  context.lineWidth = 2;
  context.strokeRect(72, 158, 1776, 96);
  context.strokeRect(72, 466, 840, 110);
  context.strokeRect(984, 466, 864, 110);
  context.strokeRect(72, 646, 1776, 104);
  context.fillStyle = "#94a3b8";
  context.font = "400 17px system-ui, sans-serif";
  context.fillText("Recommended test node order: CST / RCM -> exposure and white balance -> POST LUT, Key Output 1.000", 72, 1008);
  context.fillText("Export the actual timeline frame as PNG, 16-bit TIFF, or uncompressed RGB DPX, then upload it to Round-Trip Calibration.", 72, 1040);
  return canvas;
};

export const downloadCalibrationChartPng = async (): Promise<void> => {
  let url = "";
  try {
    const canvas = createCalibrationChartCanvas();
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result === null) {
          reject(new Error("校准图 PNG 编码失败。"));
          return;
        }
        resolve(result);
      }, "image/png");
    });
    url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "AI_Film_LUT_RoundTrip_Calibration_sRGB_Full.png";
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } catch (error) {
    const message = error instanceof Error ? error.message : "校准图生成失败。";
    throw new Error(message);
  } finally {
    if (url.length > 0) {
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
};
