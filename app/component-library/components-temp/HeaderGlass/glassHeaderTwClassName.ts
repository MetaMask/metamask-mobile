/**
 * 16px horizontal inset for glass headers.
 *
 * MMDS headers default to `px-2`. Callers also pass layout classes such as
 * `min-h-14 h-auto`, and those have to stay. `px-4` is last so it wins over a
 * caller `px-*`.
 *
 * @param twClassName - Caller classes to keep.
 * @returns The merged Tailwind class string.
 */
export const glassHeaderTwClassName = (twClassName?: string): string =>
  [twClassName, 'px-4'].filter(Boolean).join(' ');
