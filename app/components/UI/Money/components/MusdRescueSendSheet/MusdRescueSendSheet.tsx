import React, { useCallback, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonBaseSize,
  ButtonVariant,
  TextField,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import { BigNumber } from 'bignumber.js';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import useMoneyAccountMusdRescueSend from '../../hooks/useMoneyAccountMusdRescueSend';
import useMusdRescueRecipients from '../../hooks/useMusdRescueRecipients';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';
import { MUSD_CURRENCY } from '../../../Earn/constants/musd';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { MusdRescueSendSheetTestIds } from '../MoneyTransferSheet/MoneyTransferSheet.testIds';
import MusdRescueRecipientSelector from './MusdRescueRecipientSelector';

const MusdRescueSendSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { liquidMusd, isBalanceLoading, isBalanceFetchError } =
    useMoneyAccountBalance();
  const { recipients } = useMusdRescueRecipients();
  const { initiateRescueSend } = useMoneyAccountMusdRescueSend();

  const { trackBottomSheetViewed, trackSurfaceClicked } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_TRANSFER_MONEY_SHEET,
  });
  useMountEffect(trackBottomSheetViewed);

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  // Set synchronously on entry so a second tap cannot start a second
  // submission while the first is still resolving.
  const isSubmitInFlightRef = useRef(false);

  const isBalanceUnavailable = isBalanceLoading || isBalanceFetchError;
  const hasLiquidBalance = Boolean(liquidMusd?.gt(0));
  const maxAmount = liquidMusd?.toString() ?? '';

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleMax = useCallback(() => {
    if (maxAmount) {
      setAmount(maxAmount);
    }
  }, [maxAmount]);

  const handleSendInner = useCallback(async () => {
    setErrorMessage(undefined);

    if (!recipient) {
      setErrorMessage(
        strings('money.musd_rescue_send.error_invalid_recipient'),
      );
      return;
    }

    const amountValue = new BigNumber(amount);
    if (!amountValue.isFinite() || amountValue.lte(0)) {
      setErrorMessage(strings('money.musd_rescue_send.error_invalid_amount'));
      return;
    }
    if (isBalanceUnavailable) {
      setErrorMessage(
        strings('money.musd_rescue_send.error_balance_unavailable'),
      );
      return;
    }
    if (!liquidMusd || amountValue.gt(liquidMusd)) {
      setErrorMessage(
        strings('money.musd_rescue_send.error_insufficient_balance'),
      );
      return;
    }

    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_TRANSFER_MONEY_SHEET_SEND_EXTERNAL,
      redirect_target: SCREEN_NAMES.MONEY_TRANSFER,
    });

    setIsSubmitting(true);
    try {
      await initiateRescueSend({
        recipient,
        amount,
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'reason' in error &&
        error.reason === 'vmusd-balance-present'
      ) {
        setErrorMessage(
          strings('money.musd_rescue_send.error_vmusd_balance_present'),
        );
      } else {
        setErrorMessage(strings('money.musd_rescue_send.error_send_failed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    amount,
    initiateRescueSend,
    isBalanceUnavailable,
    liquidMusd,
    recipient,
    trackSurfaceClicked,
  ]);

  const handleSend = useCallback(async () => {
    if (isSubmitInFlightRef.current) {
      return;
    }
    isSubmitInFlightRef.current = true;
    try {
      await handleSendInner();
    } finally {
      isSubmitInFlightRef.current = false;
    }
  }, [handleSendInner]);

  const isSendDisabled =
    isSubmitting || !recipient || !amount || isBalanceUnavailable;

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MusdRescueSendSheetTestIds.CONTAINER}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: MusdRescueSendSheetTestIds.CLOSE_BUTTON }}
      >
        <Text variant={TextVariant.HeadingSm}>
          {strings('money.musd_rescue_send.title')}
        </Text>
      </BottomSheetHeader>
      <Box twClassName="p-4 gap-4">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('money.musd_rescue_send.explainer')}
        </Text>

        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={MusdRescueSendSheetTestIds.LIQUID_BALANCE}
        >
          {isBalanceUnavailable
            ? strings('money.musd_rescue_send.error_balance_unavailable')
            : `${strings('money.musd_rescue_send.available_label')}: ${liquidMusd?.toString() ?? '0'} ${MUSD_CURRENCY}`}
        </Text>

        <MusdRescueRecipientSelector
          recipients={recipients}
          selectedAddress={recipient}
          onSelect={setRecipient}
          isDisabled={isSubmitting}
        />

        <TextField
          testID={MusdRescueSendSheetTestIds.AMOUNT_INPUT}
          value={amount}
          onChangeText={setAmount}
          placeholder={strings('money.musd_rescue_send.amount_label')}
          accessibilityLabel={strings('money.musd_rescue_send.amount_label')}
          isDisabled={isSubmitting || !hasLiquidBalance}
          inputProps={{ keyboardType: 'decimal-pad' }}
          endAccessory={
            // The design-system Button aligns itself to the top of the field's
            // cross axis (`self-start`), so wrap it in a full-height,
            // vertically-centered Box to keep "Max" optically centered.
            <Box
              twClassName="h-12 justify-center"
              testID={MusdRescueSendSheetTestIds.MAX_BUTTON_WRAPPER}
            >
              <Button
                variant={ButtonVariant.Tertiary}
                size={ButtonBaseSize.Sm}
                onPress={handleMax}
                testID={MusdRescueSendSheetTestIds.MAX_BUTTON}
                isDisabled={!hasLiquidBalance}
              >
                {strings('money.musd_rescue_send.max')}
              </Button>
            </Box>
          }
        />

        {errorMessage ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            accessibilityLiveRegion="polite"
            testID={MusdRescueSendSheetTestIds.ERROR_MESSAGE}
          >
            {errorMessage}
          </Text>
        ) : null}

        <Button
          variant={ButtonVariant.Primary}
          onPress={handleSend}
          isDisabled={isSendDisabled}
          isLoading={isSubmitting}
          testID={MusdRescueSendSheetTestIds.SEND_BUTTON}
        >
          {strings('money.musd_rescue_send.send')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default MusdRescueSendSheet;
