/**
 * The last Reduce Transparency value read from the OS, kept for the session.
 *
 * The read is async, so a surface that mounts fresh, like the trade tray on
 * every open, would otherwise draw an opaque first frame and then swap to blur
 * once the read lands. The tab bar performs the first read at launch, so later
 * mounts can start from the known answer. Undefined until that first read.
 */
let remembered: boolean | undefined;

export const getRememberedReduceTransparency = (): boolean | undefined =>
  remembered;

export const rememberReduceTransparency = (enabled: boolean): void => {
  remembered = enabled;
};
