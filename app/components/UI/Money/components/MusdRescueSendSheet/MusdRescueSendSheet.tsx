import React, { useCallback, useRef, useState } from 'react';
import { ethers } from 'ethers';
import { useNavigation } from '@react-navigation/native';
import { CHAIN_IDS } from '@metamask/transaction-controller';
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
import { doENSLookup } from '../../../../../util/ENSUtils';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import useMoneyAccountMusdRescueSend from '../../hooks/useMoneyAccountMusdRescueSend';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';
import { MUSD_CURRENCY } from '../../../Earn/constants/musd';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { MusdRescueSendSheetTestIds } from '../MoneyTransferSheet/MoneyTransferSheet.testIds';

const MusdRescueSendSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { liquidMusd, isBalanceLoading, isBalanceFetchError } =
    useMoneyAccountBalance();
  const { initiateRescueSend } = useMoneyAccountMusdRescueSend();

  const { trackBottomSheetViewed, trackSurfaceClicked } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_TRANSFER_MONEY_SHEET,
  });
  useMountEffect(trackBottomSheetViewed);

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

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

  const handleSend = useCallback(async () => {
    setErrorMessage(undefined);

    let resolvedRecipient = recipient;
    if (!ethers.utils.isAddress(recipient)) {
      if (!recipient.includes('.')) {
        setErrorMessage(
          strings('money.musd_rescue_send.error_invalid_recipient'),
        );
        return;
      }

      // The current ENS helper supports Ethereum mainnet only. Resolve .eth
      // names there; the resulting address can still receive Monad mUSD.
      try {
        resolvedRecipient =
          (await doENSLookup(recipient, CHAIN_IDS.MAINNET)) ?? '';
      } catch {
        resolvedRecipient = '';
      }
      if (!ethers.utils.isAddress(resolvedRecipient)) {
        setErrorMessage(
          strings('money.musd_rescue_send.error_invalid_recipient'),
        );
        return;
      }
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
        recipient: resolvedRecipient,
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

        <TextField
          testID={MusdRescueSendSheetTestIds.RECIPIENT_INPUT}
          value={recipient}
          onChangeText={setRecipient}
          placeholder={strings('money.musd_rescue_send.recipient_placeholder')}
          isDisabled={isSubmitting}
        />

        <TextField
          testID={MusdRescueSendSheetTestIds.AMOUNT_INPUT}
          value={amount}
          onChangeText={setAmount}
          placeholder={strings('money.musd_rescue_send.amount_label')}
          isDisabled={isSubmitting || !hasLiquidBalance}
          inputProps={{ keyboardType: 'decimal-pad' }}
          endAccessory={
            <Button
              variant={ButtonVariant.Tertiary}
              size={ButtonBaseSize.Sm}
              onPress={handleMax}
              testID={MusdRescueSendSheetTestIds.MAX_BUTTON}
              isDisabled={!hasLiquidBalance}
            >
              {strings('money.musd_rescue_send.max')}
            </Button>
          }
        />

        {errorMessage ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
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
