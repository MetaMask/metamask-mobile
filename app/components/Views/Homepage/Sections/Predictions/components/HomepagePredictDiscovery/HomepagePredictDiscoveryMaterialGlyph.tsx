import React from 'react';
import { View } from 'react-native';
import { Bitcoin, Goal, Trophy } from 'lucide-react-native';
import { useTheme } from '../../../../../../../util/theme';

export type HomepagePredictDiscoveryMaterialGlyphName =
  | 'currencyBitcoin'
  | 'emojiEvents'
  | 'sportsSoccer';

const LUCIDE_GLYPH: Record<
  HomepagePredictDiscoveryMaterialGlyphName,
  typeof Bitcoin
> = {
  currencyBitcoin: Bitcoin,
  emojiEvents: Trophy,
  sportsSoccer: Goal,
};

interface HomepagePredictDiscoveryMaterialGlyphProps {
  name: HomepagePredictDiscoveryMaterialGlyphName;
  /** Pixel size; matches prior `size={22}`. */
  size?: number;
  /** When omitted, uses theme `colors.icon.default`. */
  color?: string;
}

/**
 * Decorative Lucide 1.5-stroke glyph for Predict discovery rows.
 */
const HomepagePredictDiscoveryMaterialGlyph: React.FC<
  HomepagePredictDiscoveryMaterialGlyphProps
> = ({ name, size = 22, color: colorProp }) => {
  const { colors } = useTheme();
  const color = colorProp ?? colors.icon.default;
  const Glyph = LUCIDE_GLYPH[name];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Glyph size={size} color={color} strokeWidth={1.5} fill="none" />
    </View>
  );
};

export default HomepagePredictDiscoveryMaterialGlyph;
