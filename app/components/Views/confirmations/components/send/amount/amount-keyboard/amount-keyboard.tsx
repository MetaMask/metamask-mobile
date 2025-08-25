import React, { useCallback } from 'react';

import { strings } from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../../hooks/useStyles';
import { TokenStandard } from '../../../../types/token';
import { useAmountSelectionMetrics } from '../../../../hooks/send/metrics/useAmountSelectionMetrics';
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
  { value: 75, label: '75%' },
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
  const { amountError } = useAmountValidation();
  const { asset, updateValue } = useSendContext();
  const { styles } = useStyles(styleSheet, {
    continueDisabled: Boolean(amountError),
  });
  const { captureAmountSelected, setAmountInputMethodPressedMax } =
    useAmountSelectionMetrics();
  const isNFT = asset?.standard === TokenStandard.ERC1155;

  const updateToPercentageAmount = useCallback(
    (percentage: number) => {
      const percentageAmount = getPercentageAmount(percentage) ?? '0';
      updateAmount(
        fiatMode ? getFiatValue(percentageAmount).toString() : percentageAmount,
      );
      updateValue(percentageAmount);
      if (percentage === 100) {
        setAmountInputMethodPressedMax();
      }
    },
    [
      fiatMode,
      getFiatValue,
      getPercentageAmount,
      setAmountInputMethodPressedMax,
      updateAmount,
      updateValue,
    ],
  );

  const updateToNewAmount = useCallback(
    (amt: string) => {
      updateAmount(amt);
      updateValue(fiatMode ? getNativeValue(amt) : amt);
    },
    [fiatMode, getNativeValue, updateAmount, updateValue],
  );

  const goToNextPage = useCallback(() => {
    captureAmountSelected();
    gotToSendScreen(Routes.SEND.RECIPIENT);
  }, [captureAmountSelected, gotToSendScreen]);

  return (
    <EditAmountKeyboard
      additionalButtons={
        isMaxAmountSupported
          ? ADDITIONAL_KAYBOARD_BUTTONS_INCLUDING_MAX
          : ADDITIONAL_KAYBOARD_BUTTONS
      }
      additionalRow={
        amount.length > 0 || isNFT ? (
          <Button
            disabled={Boolean(amountError)}
            label={
              amountError ??
              (isNFT ? strings('send.next') : strings('send.continue'))
            }
            onPress={goToNextPage}
            size={ButtonSize.Lg}
            style={styles.continueButton}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
          />
        ) : undefined
      }
      hideDoneButton
      onChange={updateToNewAmount}
      onPercentagePress={updateToPercentageAmount}
      showAdditionalKeyboard={amount.length < 1 && !isNFT}
      value={amount}
    />
  );
};
