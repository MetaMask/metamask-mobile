import React from 'react';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import HomepagePredictDiscoveryMaterialGlyph, {
  type HomepagePredictDiscoveryMaterialGlyphName,
} from './HomepagePredictDiscoveryMaterialGlyph';

interface HomepagePredictDiscoveryRowIconProps {
  /** Remote design-system icon; when unset the row's default glyph renders. */
  iconName?: IconName;
  fallbackGlyph: HomepagePredictDiscoveryMaterialGlyphName;
}

/**
 * Decorative leading icon for a homepage Predict discovery row.
 */
const HomepagePredictDiscoveryRowIcon: React.FC<
  HomepagePredictDiscoveryRowIconProps
> = ({ iconName, fallbackGlyph }) =>
  iconName ? (
    <Icon
      name={iconName}
      size={IconSize.Lg}
      color={IconColor.IconDefault}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`homepage-predict-discovery-row-icon-${iconName}`}
    />
  ) : (
    <HomepagePredictDiscoveryMaterialGlyph name={fallbackGlyph} />
  );

export default HomepagePredictDiscoveryRowIcon;
