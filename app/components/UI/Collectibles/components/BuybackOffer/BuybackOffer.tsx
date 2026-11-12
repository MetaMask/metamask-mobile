import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconColor,
  KeyValueRow,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { CollectiblesBuybackOfferTestIds } from '../../Collectibles.testIds';
import type { BuybackDisplay } from '../../providers/pack-partner/hooks/useBuybackOffer';
import { formatUsdcAmount } from '../../providers/pack-partner/utils/format';
import UsdcAmount from '../UsdcAmount';

export interface BuybackOfferProps {
  display: BuybackDisplay;
  onRetry?: () => void;
  isRetrying?: boolean;
}

/** Instant buyback offer box: checking, offer amount, or no offer. */
const BuybackOffer = ({ display, onRetry, isRetrying }: BuybackOfferProps) => (
  <Box twClassName="w-full rounded-xl bg-section px-4 py-3">
    {display.status === 'checking' && (
      <Spinner
        color={IconColor.IconAlternative}
        loadingText={strings('collectibles.reveal.buyback_checking')}
        loadingTextProps={{ color: TextColor.TextAlternative }}
        twClassName="h-10"
        testID={CollectiblesBuybackOfferTestIds.CHECKING}
      />
    )}
    {display.status === 'available' && (
      <KeyValueRow
        keyLabel={strings('collectibles.reveal.buyback_offer')}
        value={
          <UsdcAmount
            amount={formatUsdcAmount(display.amount)}
            color={TextColor.SuccessDefault}
            fontWeight={FontWeight.Bold}
            testID={CollectiblesBuybackOfferTestIds.AVAILABLE}
          />
        }
      />
    )}
    {display.status === 'unavailable' && (
      <Box twClassName="h-10 justify-center">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={CollectiblesBuybackOfferTestIds.UNAVAILABLE}
        >
          {strings('collectibles.reveal.buyback_unavailable')}
        </Text>
      </Box>
    )}
    {(display.status === 'error' || display.status === 'pending') && (
      <Box gap={2}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={
            display.status === 'pending'
              ? CollectiblesBuybackOfferTestIds.PENDING
              : CollectiblesBuybackOfferTestIds.ERROR
          }
        >
          {strings(
            display.status === 'pending'
              ? 'collectibles.errors.sale_pending'
              : 'collectibles.reveal.buyback_error',
          )}
        </Text>
        {display.status === 'pending' && display.hasFailed && (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            testID={CollectiblesBuybackOfferTestIds.ERROR}
          >
            {strings('collectibles.card.sale_status_error')}
          </Text>
        )}
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Md}
          onPress={onRetry}
          isLoading={isRetrying}
          isDisabled={isRetrying}
          testID={CollectiblesBuybackOfferTestIds.RETRY}
        >
          {strings(
            display.status === 'pending'
              ? 'collectibles.card.check_sale_status'
              : 'collectibles.errors.retry',
          )}
        </Button>
      </Box>
    )}
  </Box>
);

export default BuybackOffer;
