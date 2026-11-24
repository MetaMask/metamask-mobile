type Rgb = [number, number, number];

/** WCAG AA for text. */
const MIN_CONTRAST = 4.5;
const MIX_STEPS = 20;

const parseHex = (color: string): Rgb | undefined => {
  const match = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(color);
  if (!match) return undefined;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const toHex = (rgb: Rgb) =>
  `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;

const luminance = (rgb: Rgb) => {
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (first: Rgb, second: Rgb) => {
  const [light, dark] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (light + 0.05) / (dark + 0.05);
};

/**
 * A team or outcome color, tinted toward white (or black on light themes)
 * just enough to read as text on the background. Keeps the hue recognizable.
 */
export const legibleColor = (color: string, background: string): string => {
  const foreground = parseHex(color);
  const surface = parseHex(background);
  if (!foreground || !surface) return color;
  const target = luminance(surface) < 0.5 ? 255 : 0;
  for (let step = 0; step <= MIX_STEPS; step += 1) {
    const mix = step / MIX_STEPS;
    const tinted = foreground.map((channel) =>
      Math.round(channel + (target - channel) * mix),
    ) as Rgb;
    if (contrast(tinted, surface) >= MIN_CONTRAST) return toHex(tinted);
  }
  return toHex([target, target, target]);
};
