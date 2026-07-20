/**
 * Formats a number string to match a template pattern
 * @param value - The number string to format
 * @param template - The template pattern (e.g., "XXX XXX XXXX")
 * @returns The formatted string matching the template
 */
export const formatNumberToTemplate = (
  value: string,
  template: string,
): string => {
  const digits = value.replace(/\D/g, '');

  if (!digits) return '';

  const templateDigitCount = (template.match(/X/g) || []).length;
  if (digits.length > templateDigitCount) return digits;
  let result = '';
  let digitIndex = 0;

  for (let i = 0; i < template.length && digitIndex < digits.length; i++) {
    const templateChar = template[i];

    if (templateChar === 'X') {
      result += digits[digitIndex];
      digitIndex++;
    } else {
      result += templateChar;
    }
  }

  return result;
};
