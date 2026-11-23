import { IconName } from '@metamask/design-system-react-native';

const DESIGN_SYSTEM_ICON_NAMES = new Set<string>(Object.values(IconName));

/**
 * Maps a remote row icon onto the design-system icon set. Names this build
 * does not ship resolve to `undefined`, so the row keeps its default glyph.
 */
export const resolveHomepagePredictSlotIconName = (
  iconName?: string,
): IconName | undefined =>
  iconName && DESIGN_SYSTEM_ICON_NAMES.has(iconName)
    ? (iconName as IconName)
    : undefined;
