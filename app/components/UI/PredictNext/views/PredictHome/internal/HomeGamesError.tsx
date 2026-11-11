import React, { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  Box,
  Button,
  ButtonVariant,
  Text,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { PredictHomeTestIds } from '../PredictHome.testIds';

interface HomeGamesErrorProps {
  /** Reads the failed game Feeds again. */
  onRetry: () => void;
}

/**
 * What Home shows when a game Feed behind the Trending and Sports rows failed
 * without cached Events: one message and a Retry for every such read, so a
 * row that lost its Games does not vanish without a way back.
 *
 * Screen readers hear the message once each time it appears. iOS ignores
 * `accessibilityLiveRegion`, so the announcement is what reaches VoiceOver.
 */
export const HomeGamesError = ({ onRetry }: HomeGamesErrorProps) => {
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      strings('predict_next.home_feed.games_error'),
    );
  }, []);

  return (
    <Box
      testID={PredictHomeTestIds.HOME_GAMES_ERROR}
      twClassName="items-start gap-2 py-4"
    >
      <Text accessibilityRole="alert" accessibilityLiveRegion="polite">
        {strings('predict_next.home_feed.games_error')}
      </Text>
      <Button
        testID={PredictHomeTestIds.HOME_GAMES_RETRY}
        variant={ButtonVariant.Tertiary}
        onPress={onRetry}
      >
        {strings('predict_next.home_feed.retry')}
      </Button>
    </Box>
  );
};
