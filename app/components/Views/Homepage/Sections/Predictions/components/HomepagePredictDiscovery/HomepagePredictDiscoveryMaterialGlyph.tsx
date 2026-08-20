import React from 'react';
import { View } from 'react-native';
import {
  CurrencyBtcIcon,
  SoccerBallIcon,
  TrophyIcon,
  type Icon,
} from 'phosphor-react-native';
import { useTheme } from '../../../../../../../util/theme';

export type HomepagePredictDiscoveryMaterialGlyphName =
  | 'currencyBitcoin'
  | 'emojiEvents'
  | 'sportsSoccer';

const PHOSPHOR_GLYPH: Record<HomepagePredictDiscoveryMaterialGlyphName, Icon> =
  {
    currencyBitcoin: CurrencyBtcIcon,
    emojiEvents: TrophyIcon,
    sportsSoccer: SoccerBallIcon,
  };

interface HomepagePredictDiscoveryMaterialGlyphProps {
  name: HomepagePredictDiscoveryMaterialGlyphName;
  /** Pixel size; matches prior `size={22}`. */
  size?: number;
  /** When omitted, uses theme `colors.icon.default`. */
  color?: string;
}

/**
 * Decorative Phosphor Regular glyph for Predict discovery rows.
 */
const HomepagePredictDiscoveryMaterialGlyph: React.FC<
  HomepagePredictDiscoveryMaterialGlyphProps
> = ({ name, size = 22, color: colorProp }) => {
  const { colors } = useTheme();
  const color = colorProp ?? colors.icon.default;
  const Glyph = PHOSPHOR_GLYPH[name];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Glyph size={size} color={color} weight="regular" />
    </View>
  );
};

export default HomepagePredictDiscoveryMaterialGlyph;
