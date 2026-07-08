interface SliderControlProps {
  readonly label: string;
  readonly value: number;
  readonly min?: number;
  readonly max?: number;
  readonly onChange: (value: number) => void;
}

export const SliderControl = ({ label, value, min = 0, max = 100, onChange }: SliderControlProps) => {
  return (
    <label className="slider-control">
      <span>
        {label}
        <strong>{value}</strong>
      </span>
      <input
        max={max}
        min={min}
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
};
