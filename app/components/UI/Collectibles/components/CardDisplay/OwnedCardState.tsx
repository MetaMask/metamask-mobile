import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { CollectiblesCardViewTestIds } from '../../Collectibles.testIds';
import ErrorPanel from '../ErrorPanel';
import type { CollectiblesErrorState } from '../../types';
import { getPackPartnerErrorMessage } from '../../providers/pack-partner/utils/errorMessages';

export interface OwnedCardStateProps {
  /** No owned-cards read has completed yet. */
  isLoading: boolean;
  /** The owned-cards read failed. */
  error?: CollectiblesErrorState;
  onRetry: () => void;
}

/**
 * What a card screen shows while it cannot show the card: the owned cards are
 * still being read, the read failed, or the account does not own the card.
 */
const OwnedCardState = ({ isLoading, error, onRetry }: OwnedCardStateProps) => (
  <Box
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
    twClassName="flex-1 px-8"
  >
    {isLoading ? (
      <Box testID={CollectiblesCardViewTestIds.LOADING} accessible={false}>
        <Spinner />
      </Box>
    ) : error ? (
      <ErrorPanel
        title={strings('collectibles.cards.sync_error')}
        description={getPackPartnerErrorMessage(error.code)}
        onRetry={onRetry}
        testID={CollectiblesCardViewTestIds.READ_ERROR}
      />
    ) : (
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center"
        testID={CollectiblesCardViewTestIds.NOT_FOUND}
      >
        {strings('collectibles.card.not_found')}
      </Text>
    )}
  </Box>
);

export default OwnedCardState;
