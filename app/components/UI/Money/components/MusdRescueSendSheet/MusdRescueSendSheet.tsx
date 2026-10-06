import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonVariant,
  IconName,
  TextField,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { ethers } from 'ethers';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { BigNumber } from 'bignumber.js';
import Logger from '../../../../../util/Logger';
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
import styleSheet from './MusdRescueSendSheet.styles';

const MusdRescueSendSheet = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet, {});
  const dispatch = useDispatch();

  const { liquidMusd, isBalanceLoading, isBalanceFetchError } =
    useMoneyAccountBalance();

  const { initiateRescueSend } = useMoneyAccountMusdRescueSend();

  const { trackBottomSheetViewed, trackSurfaceClicked } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MUSD_RESCUE_SEND_SHEET,
  });
  useMountEffect(trackBottomSheetViewed);

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // Canonical liquid balance in raw units, passed to the hook for the
  // submission-time revalidation against a current balance.
  const liquidMusdRaw = useMemo(() => {
    if (!liquidMusd) return undefined;
    // The raw value lives on the canonical query; re-derive from the decimal
    // BigNumber is lossy-free at 6 decimals for display purposes, but the
    // authoritative raw string comes from the balance query. Read it from the
    // hook result instead: liquidMusd is derived from musdBalance, so converting
    // back is exact for values within 6 decimals.
    return liquidMusd.shiftedBy(6).toFixed(0, BigNumber.ROUND_DOWN);
  }, [liquidMusd]);

  const isBalanceUnavailable = isBalanceLoading || isBalanceFetchError;

  const hasLiquidBalance = Boolean(liquidMusd?.gt(0));

  const maxAmount = liquidMusd?.toString() ?? '';

  const handleMax = useCallback(() => {
    if (maxAmount) {
      setAmount(maxAmount);
    }
  }, [maxAmount]);

  const handleSend = useCallback(async () => {
    setErrorMessage(undefined);

    if (!ethers.utils.isAddress(recipient)) {
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
    if (isBalanceUnavailable || liquidMusdRaw === undefined) {
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
      component_name: COMPONENT_NAMES.MUSD_RESCUE_SEND_SHEET,
      redirect_target: SCREEN_NAMES.MONEY_TRANSFER,
    });

    setIsSubmitting(true);
    try {
      await initiateRescueSend({
        recipient,
        amount,
        liquidMusdRaw,
      });
      // Confirmation opened over this sheet; close it beneath.
      navigation.goBack();
    } catch (error) {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        '[MusdRescueSendSheet] Send failed',
      );
      setErrorMessage(strings('money.musd_rescue_send.error_send_failed'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    amount,
    initiateRescueSend,
    isBalanceUnavailable,
    liquidMusd,
    liquidMusdRaw,
    navigation,
    recipient,
    trackSurfaceClicked,
  ]);

  const isSendDisabled =
    isSubmitting || !recipient || !amount || isBalanceUnavailable;

  return (
    <Box testID={MusdRescueSendSheetTestIds.CONTAINER} style={styles.container}>
      <Text variant={TextVariant.HeadingSm}>
        {strings('money.musd_rescue_send.title')}
      </Text>
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
        startAccessory={
          <Button
            variant={ButtonVariant.Primary}
            onPress={handleMax}
            testID={MusdRescueSendSheetTestIds.MAX_BUTTON}
            isDisabled={!hasLiquidBalance}
          >
            Max
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
  );
};

export default MusdRescueSendSheet;
