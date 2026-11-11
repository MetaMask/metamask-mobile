import React from 'react';
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
 */
export const HomeGamesError = ({ onRetry }: HomeGamesErrorProps) => (
  <Box
    testID={PredictHomeTestIds.HOME_GAMES_ERROR}
    twClassName="items-start gap-2 py-4"
  >
    <Text>{strings('predict_next.home_feed.games_error')}</Text>
    <Button
      testID={PredictHomeTestIds.HOME_GAMES_RETRY}
      variant={ButtonVariant.Tertiary}
      onPress={onRetry}
    >
      {strings('predict_next.home_feed.retry')}
    </Button>
  </Box>
);
