import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  IconColor,
  IconSize,
  Spinner,
} from '@metamask/design-system-react-native';

import CapsuleGlass from '../../../../component-library/components-temp/CapsuleGlass';
import { strings } from '../../../../../locales/i18n';

export interface ShareButtonSpinnerProps {
  /** Seats the spinner in a header glass capsule, like `ButtonIconGlass`. */
  isCapsule?: boolean;
  testID?: string;
}

/**
 * Stands in for a share `ButtonIcon` (size Md) while the preview card renders
 * and the link is created, at the same footprint so the header does not move.
 */
const ShareButtonSpinner = ({
  isCapsule = false,
  testID,
}: ShareButtonSpinnerProps) => {
  const spinner = (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="h-8 w-8"
      accessibilityRole="progressbar"
      accessibilityLabel={strings('social_leaderboard.share_preparing')}
      testID={testID}
    >
      <Spinner
        color={IconColor.IconDefault}
        spinnerIconProps={{ size: IconSize.Md }}
      />
    </Box>
  );
  return isCapsule ? (
    <CapsuleGlass twClassName="h-10 w-10 justify-center">
      {spinner}
    </CapsuleGlass>
  ) : (
    spinner
  );
};

export default ShareButtonSpinner;
