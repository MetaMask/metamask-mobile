import React from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

interface RewardsOverviewProps {
  tabLabel?: string;
  isVisible?: boolean;
  onVisibilityChange?: (callback: (visible: boolean) => void) => void;
}

const RewardsOverview: React.FC<RewardsOverviewProps> = () => (
  <Box
    twClassName="flex-1 items-center justify-center border-dashed border-default border-2 rounded-md my-4"
    testID={REWARDS_VIEW_SELECTORS.TAB_CONTENT_OVERVIEW}
  >
    <Text variant={TextVariant.BodyMd}>
      {strings('rewards.not_implemented')}
    </Text>
  </Box>
);

export default RewardsOverview;
