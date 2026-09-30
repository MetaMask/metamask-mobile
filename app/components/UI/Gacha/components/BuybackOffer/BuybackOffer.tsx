import React from 'react';
import { ActivityIndicator } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  KeyValueRow,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { GachaBuybackOfferTestIds } from '../../Gacha.testIds';
import type { BuybackDisplay } from '../../providers/collector-crypt/hooks/useRefreshBuyback';
import { formatUsdcAmount } from '../../providers/collector-crypt/utils/format';
import UsdcAmount from '../UsdcAmount';

export interface BuybackOfferProps {
  display: BuybackDisplay;
  onRetry?: () => void;
  isRetrying?: boolean;
}

/** Instant buyback offer box: checking, offer amount, or no offer. */
const BuybackOffer = ({ display, onRetry, isRetrying }: BuybackOfferProps) => {
  const tw = useTailwind();

  return (
    <Box twClassName="w-full rounded-xl bg-section px-4 py-3">
      {display.status === 'checking' && (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
          twClassName="h-10"
          testID={GachaBuybackOfferTestIds.CHECKING}
        >
          <ActivityIndicator
            size="small"
            color={tw.color('icon-alternative')}
          />
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('gacha.reveal.buyback_checking')}
          </Text>
        </Box>
      )}
      {display.status === 'available' && (
        <KeyValueRow
          keyLabel={strings('gacha.reveal.buyback_offer')}
          value={
            <UsdcAmount
              amount={formatUsdcAmount(display.amount)}
              color={TextColor.SuccessDefault}
              fontWeight={FontWeight.Bold}
              testID={GachaBuybackOfferTestIds.AVAILABLE}
            />
          }
        />
      )}
      {display.status === 'unavailable' && (
        <Box twClassName="h-10 justify-center">
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={GachaBuybackOfferTestIds.UNAVAILABLE}
          >
            {strings('gacha.reveal.buyback_unavailable')}
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
                ? GachaBuybackOfferTestIds.PENDING
                : GachaBuybackOfferTestIds.ERROR
            }
          >
            {strings(
              display.status === 'pending'
                ? 'gacha.errors.sale_pending'
                : 'gacha.reveal.buyback_error',
            )}
          </Text>
          {display.status === 'pending' && display.hasFailed && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.ErrorDefault}
              testID={GachaBuybackOfferTestIds.ERROR}
            >
              {strings('gacha.card.sale_status_error')}
            </Text>
          )}
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Md}
            onPress={onRetry}
            isLoading={isRetrying}
            isDisabled={isRetrying}
            testID={GachaBuybackOfferTestIds.RETRY}
          >
            {strings(
              display.status === 'pending'
                ? 'gacha.card.check_sale_status'
                : 'gacha.errors.retry',
            )}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default BuybackOffer;
