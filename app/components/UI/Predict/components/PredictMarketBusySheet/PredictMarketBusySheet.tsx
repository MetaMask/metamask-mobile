import React, { forwardRef, useImperativeHandle } from 'react';
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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader/BottomSheetHeader';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter';
import { ButtonVariants } from '../../../../../component-library/components/Buttons/Button/Button.types';
import { strings } from '../../../../../../locales/i18n';
import { formatCents } from '../../utils/format';
import { Side } from '../../types';
import { PredictMarketBusySheetSelectorsIDs } from '../../Predict.testIds';
import {
  usePredictBottomSheet,
  type PredictBottomSheetRef,
} from '../../hooks/usePredictBottomSheet';

export type PredictMarketBusySheetRef = PredictBottomSheetRef;

export type PredictMarketBusySheetVariant = 'busy' | 'failed';

interface PredictMarketBusySheetProps {
  variant: PredictMarketBusySheetVariant;
  sharePrice: number;
  side: Side;
  onRetry: () => void;
  onDismiss?: () => void;
  isRetrying?: boolean;
}

const PredictMarketBusySheet = forwardRef<
  PredictMarketBusySheetRef,
  PredictMarketBusySheetProps
>(
  (
    { variant, sharePrice, side, onRetry, onDismiss, isRetrying = false },
    ref,
  ) => {
    const tw = useTailwind();
    const {
      sheetRef,
      isVisible,
      closeSheet,
      handleSheetClosed,
      getRefHandlers,
    } = usePredictBottomSheet({ onDismiss });

    useImperativeHandle(ref, getRefHandlers, [getRefHandlers]);

    if (!isVisible) {
      return null;
    }

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
      <BottomSheet
        ref={sheetRef}
        shouldNavigateBack={false}
        isInteractable
        onClose={handleSheetClosed}
      >
        <BottomSheetHeader onClose={closeSheet} style={tw.style('px-6 py-4')} />
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
        <BottomSheetFooter
          buttonPropsArray={[
            {
              variant: ButtonVariants.Primary,
              label: buttonLabel,
              onPress: onRetry,
              isDisabled: isRetrying,
              loading: isRetrying,
            },
          ]}
          style={tw.style('px-6')}
        />
      </BottomSheet>
    );
  },
);

PredictMarketBusySheet.displayName = 'PredictMarketBusySheet';

export default PredictMarketBusySheet;
