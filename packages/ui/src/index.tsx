import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { advanceStrobePhase, strobeBeatHz } from "./strobe";

export { advanceStrobePhase, strobeBeatHz } from "./strobe";

export interface TunerColors {
    sharp: string;
    flat: string;
    inTune: string;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ asChild = false, className = "", ...props }, ref) => {
        const Component: React.ElementType = asChild ? Slot : "button";
        return (
            <Component
                ref={ref}
                className={`wi-button ${className}`.trim()}
                {...props}
            />
        );
    },
);

Button.displayName = "Button";

export interface TunerMeterProps {
    cents: number | null;
    thresholdCents: number;
    colors: TunerColors;
    label: string;
}

export function TunerMeter({
    cents,
    thresholdCents,
    colors,
    label,
}: TunerMeterProps) {
    const bounded = cents === null ? 0 : Math.max(-50, Math.min(50, cents));
    const x = 160 + bounded * 2.5;
    const threshold = Number.isFinite(thresholdCents)
        ? Math.max(0.5, Math.min(50, thresholdCents))
        : 2;
    const color =
        cents !== null && Math.abs(cents) <= threshold
            ? colors.inTune
            : cents !== null && cents < 0
              ? colors.flat
              : colors.sharp;
    const ticks = [-50, -25, -10, -2, 0, 2, 10, 25, 50];

    return (
        <svg
            className="wi-tuner-meter"
            role="meter"
            aria-label={label}
            aria-valuemin={-50}
            aria-valuemax={50}
            aria-valuenow={cents === null ? undefined : bounded}
            aria-valuetext={
                cents === null ? label : `${cents.toFixed(1)} cents`
            }
            viewBox="0 0 320 112"
        >
            <path
                d="M20 82 Q160 -18 300 82"
                fill="none"
                stroke="currentColor"
                strokeOpacity=".2"
                strokeWidth="10"
                strokeLinecap="round"
            />
            <rect
                x={160 - threshold * 2.5}
                y={70}
                width={threshold * 5}
                height={15}
                rx={4}
                fill={colors.inTune}
                opacity=".18"
                aria-hidden="true"
            />
            <path
                d="M154 12 Q160 6 166 12 L166 82 L154 82 Z"
                fill={color}
                opacity={cents === null ? 0.35 : 1}
                transform={`translate(${x - 160} 0)`}
            />
            {ticks.map((tick) => {
                const tickX = 160 + tick * 2.5;
                const major =
                    tick === 0 ||
                    Math.abs(tick) === 50 ||
                    Math.abs(tick) === 10;
                return (
                    <g key={tick}>
                        <line
                            x1={tickX}
                            x2={tickX}
                            y1={major ? 68 : 74}
                            y2={85}
                            stroke="currentColor"
                            strokeWidth={major ? 2 : 1}
                            strokeOpacity={major ? 0.8 : 0.45}
                        />
                        {major && (
                            <text
                                x={tickX}
                                y={101}
                                textAnchor="middle"
                                fontSize="9"
                                fill="currentColor"
                            >
                                {tick > 0 ? `+${tick}` : tick}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

export interface StrobeDisplayProps {
    cents: number | null;
    /** Measured frequency. The pattern drifts at the beat against the target. */
    frequencyHz: number | null;
    overtones: number;
    color: string;
    label: string;
}

export function StrobeDisplay({
    cents,
    frequencyHz,
    overtones,
    color,
    label,
}: StrobeDisplayProps) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const valuesRef = React.useRef({ cents, frequencyHz, overtones, color });
    valuesRef.current = { cents, frequencyHz, overtones, color };

    React.useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        let animationFrame = 0;
        let previousTime = 0;
        let phase = 0;

        const resize = () => {
            const bounds = canvas.getBoundingClientRect();
            const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
            canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
            canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
        };
        resize();
        const observer = new ResizeObserver(resize);

        const draw = (time: number) => {
            const width = canvas.width;
            const height = canvas.height;
            const scale = Math.max(1, window.devicePixelRatio || 1);
            const values = valuesRef.current;
            const seconds =
                previousTime === 0
                    ? 0
                    : Math.min(0.05, (time - previousTime) / 1_000);
            previousTime = time;
            const beatHz =
                values.cents === null || values.frequencyHz === null
                    ? 0
                    : strobeBeatHz(values.frequencyHz, values.cents);
            phase = advanceStrobePhase(phase, beatHz, seconds);

            context.clearRect(0, 0, width, height);
            context.fillStyle = "#0b1220";
            context.fillRect(0, 0, width, height);
            const rowCount = Math.max(
                1,
                Math.min(4, Math.round(values.overtones)),
            );
            const rowHeight = height / rowCount;
            for (let row = 0; row < rowCount; row++) {
                const harmonic = row + 1;
                const stripes = 12 + harmonic * 4;
                const stripeWidth = width / stripes;
                const offset = phase * stripeWidth * harmonic;
                context.save();
                context.beginPath();
                context.rect(0, row * rowHeight, width, rowHeight);
                context.clip();
                for (let stripe = -1; stripe <= stripes + 1; stripe++) {
                    context.fillStyle =
                        stripe % 2 === 0 ? values.color : "#111827";
                    context.fillRect(
                        stripe * stripeWidth - offset,
                        row * rowHeight + 2 * scale,
                        stripeWidth * 0.58,
                        rowHeight - 4 * scale,
                    );
                }
                context.restore();
                if (row > 0) {
                    context.fillStyle = "rgba(255,255,255,.14)";
                    context.fillRect(0, row * rowHeight, width, scale);
                }
            }
            animationFrame = window.requestAnimationFrame(draw);
        };

        observer.observe(canvas);
        animationFrame = window.requestAnimationFrame(draw);
        return () => {
            window.cancelAnimationFrame(animationFrame);
            observer.disconnect();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="wi-strobe-display"
            role="img"
            aria-label={label}
        />
    );
}

export interface VerticalSensitivitySliderProps {
    value: number;
    label: string;
    lowLabel: string;
    highLabel: string;
    disabled?: boolean;
    onChange(value: number): void;
}

export function VerticalSensitivitySlider({
    value,
    label,
    lowLabel,
    highLabel,
    disabled = false,
    onChange,
}: VerticalSensitivitySliderProps) {
    return (
        <div className="wi-sensitivity-control">
            <label htmlFor="wi-sensitivity" className="wi-sensitivity-label">
                {label}
            </label>
            <span aria-hidden="true" className="wi-sensitivity-endpoint">
                {highLabel}
            </span>
            <input
                id="wi-sensitivity"
                className="wi-sensitivity-slider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(value * 100)}
                disabled={disabled}
                aria-label={label}
                aria-orientation="vertical"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(value * 100)}
                aria-valuetext={`${Math.round(value * 100)}%`}
                onChange={(event) =>
                    onChange(Number(event.currentTarget.value) / 100)
                }
            />
            <span aria-hidden="true" className="wi-sensitivity-endpoint">
                {lowLabel}
            </span>
        </div>
    );
}

export interface TunerReadoutProps {
    note: string | null;
    octave: number | null;
    frequencyHz: number | null;
    cents: number | null;
    inTune: boolean;
    className?: string;
    labels: {
        note: string;
        octave: string;
        frequency: string;
        deviation: string;
    };
}

export function TunerReadout({
    note,
    octave,
    frequencyHz,
    cents,
    inTune,
    className = "",
    labels,
}: TunerReadoutProps) {
    const noteText =
        note !== null && octave !== null ? `${note}${octave}` : "—";
    const frequencyText =
        frequencyHz === null ? "—" : `${frequencyHz.toFixed(2)} Hz`;
    const centsText =
        cents === null ? "—" : `${cents > 0 ? "+" : ""}${cents.toFixed(1)} ¢`;
    const items = [
        { label: labels.note, value: noteText, prominent: true },
        {
            label: labels.octave,
            value: octave === null ? "—" : String(octave),
            prominent: false,
        },
        { label: labels.frequency, value: frequencyText, prominent: false },
        { label: labels.deviation, value: centsText, prominent: false },
    ];
    return (
        <div
            className={`wi-tuner-readout ${className}`.trim()}
            data-in-tune={inTune ? "true" : "false"}
        >
            {items.map((item) => (
                <div key={item.label} className="wi-readout-metric">
                    <p className="wi-readout-label">{item.label}</p>
                    <p
                        className={
                            item.prominent
                                ? "wi-readout-value wi-readout-note"
                                : "wi-readout-value"
                        }
                    >
                        {item.value}
                    </p>
                </div>
            ))}
        </div>
    );
}

export interface TunerPaletteOption {
    id: string;
    label: string;
    colors: TunerColors;
}

export function TunerPalette({
    options,
    value,
    groupLabel,
    onChange,
}: {
    options: readonly TunerPaletteOption[];
    value: TunerColors;
    groupLabel: string;
    onChange(colors: TunerColors): void;
}) {
    const matches = (colors: TunerColors) =>
        colors.sharp.toLowerCase() === value.sharp.toLowerCase() &&
        colors.flat.toLowerCase() === value.flat.toLowerCase() &&
        colors.inTune.toLowerCase() === value.inTune.toLowerCase();
    return (
        <fieldset className="wi-palette">
            <legend className="wi-readout-label">{groupLabel}</legend>
            {options.map((option) => (
                <label key={option.id} className="wi-palette-option">
                    <input
                        className="sr-only"
                        type="radio"
                        name="wi-tuner-palette"
                        value={option.id}
                        checked={matches(option.colors)}
                        onChange={() => onChange(option.colors)}
                    />
                    <span className="sr-only">{option.label}</span>
                    <span aria-hidden="true" className="wi-palette-swatches">
                        <span
                            className="wi-palette-swatch"
                            style={{ background: option.colors.flat }}
                        />
                        <span
                            className="wi-palette-swatch"
                            style={{ background: option.colors.inTune }}
                        />
                        <span
                            className="wi-palette-swatch"
                            style={{ background: option.colors.sharp }}
                        />
                    </span>
                </label>
            ))}
        </fieldset>
    );
}
