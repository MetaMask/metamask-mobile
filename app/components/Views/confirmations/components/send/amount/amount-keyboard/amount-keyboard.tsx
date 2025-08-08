import React, { useCallback, useState } from 'react';

import { strings } from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../../hooks/useStyles';
import { useAmountValidation } from '../../../../hooks/send/useAmountValidation';
import { useCurrencyConversions } from '../../../../hooks/send/useCurrencyConversions';
import { usePercentageAmount } from '../../../../hooks/send/usePercentageAmount';
import { useSendContext } from '../../../../context/send-context';
import { useSendScreenNavigation } from '../../../../hooks/send/useSendScreenNavigation';
import { EditAmountKeyboard } from '../../../edit-amount-keyboard';
import { styleSheet } from './amount-keyboard.styles';

const ADDITIONAL_KAYBOARD_BUTTONS = [
  { value: 25, label: '25%' },
  { value: 50, label: '50%' },
];

const ADDITIONAL_KAYBOARD_BUTTONS_INCLUDING_MAX = [
  ...ADDITIONAL_KAYBOARD_BUTTONS,
  { value: 100, label: 'Max' },
];

export const AmountKeyboard = ({
  amount,
  fiatMode,
  updateAmount,
}: {
  amount: string;
  fiatMode: boolean;
  updateAmount: (value: string) => void;
}) => {
  const { getFiatValue, getNativeValue } = useCurrencyConversions();
  const { gotToSendScreen } = useSendScreenNavigation();
  const { isMaxAmountSupported, getPercentageAmount } = usePercentageAmount();
  const { invalidAmount, insufficientBalance } = useAmountValidation();
  const { updateValue } = useSendContext();
  const { styles } = useStyles(styleSheet, {
    continueDisabled: Boolean(invalidAmount || insufficientBalance),
  });
  const [showAdditionalKeyboard, setShowAdditionalKeyboard] = useState(true);

  const updateToPercentageAmount = useCallback(
    (percentage: number) => {
      const percentageAmount = getPercentageAmount(percentage) ?? '0';
      updateAmount(
        fiatMode ? getFiatValue(percentageAmount).toString() : percentageAmount,
      );
      updateValue(percentageAmount);
    },
    [fiatMode, getFiatValue, getPercentageAmount, updateAmount, updateValue],
  );

  const updateToNewAmount = useCallback(
    (amt: string) => {
      updateAmount(amt);
      updateValue(fiatMode ? getNativeValue(amt) : amt);
    },
    [fiatMode, getNativeValue, updateAmount, updateValue],
  );

  const goToNextPage = useCallback(() => {
    gotToSendScreen(Routes.SEND.RECIPIENT);
  }, [gotToSendScreen]);

  const onDonePress = useCallback(() => {
    setShowAdditionalKeyboard(false);
  }, [setShowAdditionalKeyboard]);

  return (
    <EditAmountKeyboard
      additionalButtons={
        isMaxAmountSupported
          ? ADDITIONAL_KAYBOARD_BUTTONS_INCLUDING_MAX
          : ADDITIONAL_KAYBOARD_BUTTONS
      }
      additionalRow={
        showAdditionalKeyboard ? undefined : (
          <Button
            disabled={invalidAmount || insufficientBalance}
            label={
              insufficientBalance
                ? strings('send.amount_insufficient')
                : strings('send.continue')
            }
            onPress={goToNextPage}
            size={ButtonSize.Lg}
            style={styles.continueButton}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
          />
        )
      }
      onChange={updateToNewAmount}
      onDonePress={onDonePress}
      onPercentagePress={updateToPercentageAmount}
      showAdditionalKeyboard={showAdditionalKeyboard}
      value={amount}
    />
  );
};
