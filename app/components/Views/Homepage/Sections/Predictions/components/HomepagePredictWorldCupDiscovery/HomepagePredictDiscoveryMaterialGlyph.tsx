import React from 'react';
// DS `Icon` / component-library `Icon` do not expose these Material ligatures (see glyph map).
// eslint-disable-next-line @typescript-eslint/no-deprecated -- intentional until DS adds glyphs
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../../../../../../util/theme';

/**
 * Exact Material Icons ligatures from `react-native-vector-icons` glyph map.
 * The design-system `Icon` (and deprecated component-library `Icon`) only expose
 * a fixed SVG set — they do not accept arbitrary Material font names, so this
 * component uses the deprecated `MaterialIcons` font path declared in
 * `app/declarations/index.d.ts` until those glyphs exist in the DS.
 */
const MATERIAL_ICON_NAME = {
  currencyBitcoin: 'currency-bitcoin',
  emojiEvents: 'emoji-events',
  sportsSoccer: 'sports-soccer',
} as const;

export type HomepagePredictDiscoveryMaterialGlyphName =
  keyof typeof MATERIAL_ICON_NAME;

interface HomepagePredictDiscoveryMaterialGlyphProps {
  name: HomepagePredictDiscoveryMaterialGlyphName;
  /** Pixel size; matches prior `size={22}`. */
  size?: number;
  /** When omitted, uses theme `colors.icon.default`. */
  color?: string;
}

/**
 * Decorative Material Icons row glyph via deprecated vector-icons font.
 */
const HomepagePredictDiscoveryMaterialGlyph: React.FC<
  HomepagePredictDiscoveryMaterialGlyphProps
> = ({ name, size = 22, color: colorProp }) => {
  const { colors } = useTheme();
  const color = colorProp ?? colors.icon.default;

  return (
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- MaterialIcons font (deprecated path)
    <MaterialIcons
      name={MATERIAL_ICON_NAME[name]}
      size={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
};

export default HomepagePredictDiscoveryMaterialGlyph;
