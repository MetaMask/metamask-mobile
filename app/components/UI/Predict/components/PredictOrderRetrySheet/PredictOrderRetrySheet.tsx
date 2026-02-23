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
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter';
import { ButtonVariants } from '../../../../../component-library/components/Buttons/Button/Button.types';
import { strings } from '../../../../../../locales/i18n';
import { formatCents } from '../../utils/format';
import { Side } from '../../types';
import { PredictOrderRetrySheetSelectorsIDs } from '../../Predict.testIds';
import {
  usePredictBottomSheet,
  type PredictBottomSheetRef,
} from '../../hooks/usePredictBottomSheet';
import { TouchableOpacity } from 'react-native';

export type PredictOrderRetrySheetRef = PredictBottomSheetRef;

export type PredictOrderRetrySheetVariant = 'busy' | 'failed';

interface PredictOrderRetrySheetProps {
  variant: PredictOrderRetrySheetVariant;
  sharePrice: number;
  side: Side;
  onRetry: () => void;
  onDismiss?: () => void;
  isRetrying?: boolean;
}

const PredictOrderRetrySheet = forwardRef<
  PredictOrderRetrySheetRef,
  PredictOrderRetrySheetProps
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
      ? strings(
          side === Side.BUY
            ? 'predict.order.yes_buy'
            : 'predict.order.yes_sell',
        )
      : strings('predict.order.try_again');

    return (
      <BottomSheet
        ref={sheetRef}
        shouldNavigateBack={false}
        isInteractable
        onClose={handleSheetClosed}
      >
        <TouchableOpacity
          testID={PredictOrderRetrySheetSelectorsIDs.CLOSE_BUTTON}
          onPress={closeSheet}
          style={tw.style('absolute top-8 right-4 z-10')}
        >
          <Icon
            name={IconName.Close}
            size={IconSize.Xl}
            color={IconColor.IconDefault}
          />
        </TouchableOpacity>
        <Box
          testID={PredictOrderRetrySheetSelectorsIDs.CONTAINER}
          alignItems={BoxAlignItems.Center}
          twClassName="px-6 pb-8 pt-8 gap-4"
        >
          <Box
            alignItems={BoxAlignItems.Center}
            twClassName={`h-12 w-12 rounded-full ${iconBg} justify-center`}
          >
            <Icon
              name={IconName.Warning}
              size={IconSize.Xl}
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
              testID: PredictOrderRetrySheetSelectorsIDs.RETRY_BUTTON,
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

PredictOrderRetrySheet.displayName = 'PredictOrderRetrySheet';

export default PredictOrderRetrySheet;
