import React from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../../locales/i18n';
import { formatCents } from '../../../../utils/format';

interface PredictBuyActionButtonProps {
  isLoading: boolean;
  onPress: () => void;
  disabled: boolean;
  showReducedOpacity: boolean;
  outcomeTokenTitle: string;
  sharePrice: number;
  isSheetMode?: boolean;
  isRetry?: boolean;
  isChangePaymentMode?: boolean;
  isAddFundsMode?: boolean;
  testID?: string;
}

const PredictBuyActionButton = ({
  isLoading,
  onPress,
  disabled,
  showReducedOpacity,
  outcomeTokenTitle,
  sharePrice,
  isSheetMode = false,
  isRetry = false,
  isChangePaymentMode = false,
  isAddFundsMode = false,
  testID,
}: PredictBuyActionButtonProps) => {
  const tw = useTailwind();

  if (isChangePaymentMode) {
    return (
      <Button
        testID={testID}
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={onPress}
      >
        {strings('predict.payment.change_payment_method')}
      </Button>
    );
  }

  if (isAddFundsMode) {
    return (
      <Button
        testID={testID}
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        isDanger
        onPress={onPress}
      >
        {strings('predict.payment.add_funds')}
      </Button>
    );
  }

  const actionLabel = isRetry
    ? strings('predict.order.retry')
    : isSheetMode
      ? strings('predict.order.confirm')
      : `${outcomeTokenTitle} · ${formatCents(sharePrice)}`;

  return (
    <Button
      testID={testID}
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      isFullWidth
      isDisabled={disabled}
      isLoading={isLoading}
      loadingText={`${strings('predict.order.placing_prediction')}...`}
      onPress={onPress}
      style={showReducedOpacity ? tw.style('opacity-50') : undefined}
    >
      {actionLabel}
    </Button>
  );
};

export default PredictBuyActionButton;
