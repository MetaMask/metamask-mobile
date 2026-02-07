import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import { LeaderboardTestIds } from '../../Leaderboard.testIds';

/**
 * Empty state component shown when no leaderboard data is available
 */
const LeaderboardEmpty: React.FC = () => (
  <Box
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
    twClassName="py-16"
    testID={LeaderboardTestIds.EMPTY_STATE}
  >
    <Icon name={IconName.Chart} size={IconSize.Xl} color={IconColor.Muted} />
    <Text variant={TextVariant.BodyMd} twClassName="text-muted mt-4">
      {strings('leaderboard.empty_title')}
    </Text>
    <Text variant={TextVariant.BodySm} twClassName="text-muted mt-2">
      {strings('leaderboard.empty_description')}
    </Text>
  </Box>
);

export default LeaderboardEmpty;
