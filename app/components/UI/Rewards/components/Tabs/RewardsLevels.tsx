import React from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

interface RewardsLevelsProps {
  tabLabel?: string;
  isVisible?: boolean;
  onVisibilityChange?: (callback: (visible: boolean) => void) => void;
}

const RewardsLevels: React.FC<RewardsLevelsProps> = () => (
  <Box
    twClassName="flex-1 items-center justify-center border-dashed border-default border-2 rounded-md my-4"
    testID={REWARDS_VIEW_SELECTORS.TAB_CONTENT}
  >
    <Text variant={TextVariant.BodyMd}>
      {strings('rewards.not_implemented')}
    </Text>
  </Box>
);

export default RewardsLevels;
