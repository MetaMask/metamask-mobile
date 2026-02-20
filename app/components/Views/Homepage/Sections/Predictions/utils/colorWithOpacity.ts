/**
 * Converts any color format to RGBA with specified opacity.
 * Handles: 6-char hex, 8-char hex, 3-char hex, RGB, RGBA
 */
export const colorWithOpacity = (color: string, opacity: number): string => {
  const trimmedColor = color.trim();

  // Handle 6-character hex: #RRGGBB
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmedColor)) {
    const hex = trimmedColor.substring(1);
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  // Handle 8-character hex with alpha: #RRGGBBAA (replace alpha with new opacity)
  if (/^#[0-9A-Fa-f]{8}$/.test(trimmedColor)) {
    const hex = trimmedColor.substring(1);
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  // Handle 3-character hex: #RGB → #RRGGBB
  if (/^#[0-9A-Fa-f]{3}$/.test(trimmedColor)) {
    const r = trimmedColor[1];
    const g = trimmedColor[2];
    const b = trimmedColor[3];
    const expandedHex = `${r}${r}${g}${g}${b}${b}`;
    const rInt = parseInt(expandedHex.substring(0, 2), 16);
    const gInt = parseInt(expandedHex.substring(2, 4), 16);
    const bInt = parseInt(expandedHex.substring(4, 6), 16);
    return `rgba(${rInt}, ${gInt}, ${bInt}, ${opacity})`;
  }

  // Handle 4-character hex with alpha: #RGBA
  if (/^#[0-9A-Fa-f]{4}$/.test(trimmedColor)) {
    const r = trimmedColor[1];
    const g = trimmedColor[2];
    const b = trimmedColor[3];
    const expandedHex = `${r}${r}${g}${g}${b}${b}`;
    const rInt = parseInt(expandedHex.substring(0, 2), 16);
    const gInt = parseInt(expandedHex.substring(2, 4), 16);
    const bInt = parseInt(expandedHex.substring(4, 6), 16);
    return `rgba(${rInt}, ${gInt}, ${bInt}, ${opacity})`;
  }

  // Handle rgb(r, g, b) format
  const rgbMatch = trimmedColor.match(
    /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i,
  );
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`;
  }

  // Handle rgba(r, g, b, a) format (replace alpha with new opacity)
  const rgbaMatch = trimmedColor.match(
    /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)$/i,
  );
  if (rgbaMatch) {
    return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${opacity})`;
  }

  // Fallback: validate color format before returning
  // Invalid colors can crash LinearGradient native rendering
  const isRecognizedFormat = /^(#[0-9A-Fa-f]{3,8}|rgba?\(.*\))$/i.test(
    trimmedColor,
  );
  if (!isRecognizedFormat) {
    if (__DEV__) {
      console.warn(
        `[colorWithOpacity] Invalid color format: "${trimmedColor}". Using transparent fallback.`,
      );
    }
    return 'rgba(0, 0, 0, 0)';
  }
  // Return as-is for recognized formats (e.g., named colors like 'red', 'blue')
  return trimmedColor;
};
