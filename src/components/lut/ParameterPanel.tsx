import { colorSpaceOptions, precisionOptions } from "../../utils/lutMock";
import type { ColorSpace, LutParameters, LutPrecision } from "../../types";
import { GlassCard } from "../ui/GlassCard";
import { SliderControl } from "../ui/SliderControl";

interface ParameterPanelProps {
  readonly parameters: LutParameters;
  readonly onChange: (parameters: LutParameters) => void;
}

export const ParameterPanel = ({ parameters, onChange }: ParameterPanelProps) => {
  const setNumber = (key: keyof Pick<LutParameters, "intensity" | "contrast" | "saturation" | "shadowMatch" | "midtoneMatch" | "highlightMatch" | "tint">, value: number) => {
    onChange({ ...parameters, [key]: value });
  };

  return (
    <GlassCard className="parameter-card">
      <p className="eyebrow">参数面板</p>
      <h2>仿色控制</h2>
      <SliderControl label="风格强度" value={parameters.intensity} onChange={(value) => setNumber("intensity", value)} />
      <SliderControl label="对比度" value={parameters.contrast} onChange={(value) => setNumber("contrast", value)} />
      <SliderControl label="饱和度" value={parameters.saturation} onChange={(value) => setNumber("saturation", value)} />
      <SliderControl label="阴影匹配" value={parameters.shadowMatch} onChange={(value) => setNumber("shadowMatch", value)} />
      <SliderControl label="中间调匹配" value={parameters.midtoneMatch} onChange={(value) => setNumber("midtoneMatch", value)} />
      <SliderControl label="高光匹配" value={parameters.highlightMatch} onChange={(value) => setNumber("highlightMatch", value)} />
      <SliderControl label="Tint" min={-50} max={50} value={parameters.tint} onChange={(value) => setNumber("tint", value)} />
      <label className="select-control">
        <span>输入色彩空间</span>
        <select
          value={parameters.inputColorSpace}
          onChange={(event) => onChange({ ...parameters, inputColorSpace: event.currentTarget.value as ColorSpace })}
        >
          {colorSpaceOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="select-control">
        <span>LUT 精度</span>
        <select
          value={parameters.precision}
          onChange={(event) => onChange({ ...parameters, precision: event.currentTarget.value as LutPrecision })}
        >
          {precisionOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </GlassCard>
  );
};
