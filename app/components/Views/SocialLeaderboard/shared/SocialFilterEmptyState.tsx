import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../locales/i18n';

export const SOCIAL_FILTER_EMPTY_STATE_TEST_ID = 'social-filter-empty-state';
export const SOCIAL_FILTER_EMPTY_CLEAR_TEST_ID = 'social-filter-empty-clear';

export interface SocialFilterEmptyStateProps {
  /** Clears the filters that produced this empty result. */
  onClear: () => void;
  testID?: string;
}

/**
 * Empty state for a Social tab whose filters match nothing.
 * Sits 48px below the content top, matching the unfiltered empty state.
 * Title, description, and clear action are 8px apart.
 */
const SocialFilterEmptyState: React.FC<SocialFilterEmptyStateProps> = ({
  onClear,
  testID = SOCIAL_FILTER_EMPTY_STATE_TEST_ID,
}) => (
  <Box
    alignItems={BoxAlignItems.Center}
    twClassName="w-full px-6 pt-12"
    testID={testID}
  >
    <Box alignItems={BoxAlignItems.Center} twClassName="gap-2">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
        twClassName="text-center"
      >
        {strings('social_leaderboard.feed.filter_empty.title')}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {strings('social_leaderboard.feed.filter_empty.description')}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Sm}
        onPress={onClear}
        twClassName="self-center"
        testID={SOCIAL_FILTER_EMPTY_CLEAR_TEST_ID}
      >
        {strings('social_leaderboard.feed.filter_empty.clear')}
      </Button>
    </Box>
  </Box>
);

export default SocialFilterEmptyState;
