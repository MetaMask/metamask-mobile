export const parseCommaSeparatedString = (value: string): string[] =>
  value
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
