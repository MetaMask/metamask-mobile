import React, { forwardRef } from 'react';
import {
  Box,
  BoxAlignItems,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../locales/i18n';
import { formatCents } from '../../utils/format';
import { Side } from '../../types';
import { PredictMarketBusySheetSelectorsIDs } from '../../Predict.testIds';

export type PredictMarketBusySheetRef = BottomSheetRef;

export type PredictMarketBusySheetVariant = 'busy' | 'failed';

interface PredictMarketBusySheetProps {
  variant: PredictMarketBusySheetVariant;
  sharePrice: number;
  side: Side;
  onRetry: () => void;
  onClose: () => void;
  isRetrying?: boolean;
}

const PredictMarketBusySheet = forwardRef<
  BottomSheetRef,
  PredictMarketBusySheetProps
>(
  (
    { variant, sharePrice, side, onRetry, onClose, isRetrying = false },
    ref,
  ) => {
    const isBusy = variant === 'busy';

    const iconColor = isBusy
      ? IconColor.WarningDefault
      : IconColor.ErrorDefault;
    const iconBg = isBusy ? 'bg-warning-muted' : 'bg-error-muted';

    const title = isBusy
      ? strings('predict.order.market_busy_title')
      : strings('predict.order.order_failed_title');

    const body = isBusy
      ? strings(
          side === Side.BUY
            ? 'predict.order.market_busy_body_buy'
            : 'predict.order.market_busy_body_sell',
          { price: formatCents(sharePrice) },
        )
      : strings('predict.order.order_failed_body');

    const buttonLabel = isBusy
      ? strings('predict.order.try_again_best_price')
      : strings('predict.order.try_again');

    return (
      <BottomSheet ref={ref} onClose={onClose} shouldNavigateBack={false}>
        <SheetHeader title="" onBack={onClose} />
        <Box
          testID={PredictMarketBusySheetSelectorsIDs.CONTAINER}
          alignItems={BoxAlignItems.Center}
          twClassName="px-6 pb-8 gap-4"
        >
          <Box
            alignItems={BoxAlignItems.Center}
            twClassName={`h-10 w-10 rounded-full ${iconBg} justify-center`}
          >
            <Icon
              name={IconName.Warning}
              size={IconSize.Lg}
              color={iconColor}
            />
          </Box>
          <Text
            variant={TextVariant.HeadingMd}
            color={TextColor.TextDefault}
            twClassName="text-center"
          >
            {title}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {body}
          </Text>
        </Box>
        <Box twClassName="px-6 pb-6">
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={buttonLabel}
            onPress={onRetry}
            isDisabled={isRetrying}
            loading={isRetrying}
          />
        </Box>
      </BottomSheet>
    );
  },
);

PredictMarketBusySheet.displayName = 'PredictMarketBusySheet';

export default PredictMarketBusySheet;
