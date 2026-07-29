import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import BigNumber from 'bignumber.js';
import { TransactionType } from '@metamask/transaction-controller';
import { createProjectLogger, Hex } from '@metamask/utils';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';
import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../../Earn/constants/musd';
import {
  useMoneyAccountDeposit,
  type InitiateDepositOptions,
} from '../../hooks/useMoneyAccount';
import { useMMPayFiatConfig } from '../../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';
import { useRegionHasFiatProvider } from '../../../Ramp/hooks/useRegionHasFiatProvider';
import { useMoneyAccountDepositAssetId } from '../../hooks/useMoneyAccountDepositAssetId';
import { selectHasUnapprovedTransactions } from '../../../../../selectors/transactionController';
import { selectHasAnyNonZeroTokenBalance } from '../../../../../selectors/tokenBalancesController';
import MoneySheetOptionsList, {
  type MoneySheetOption,
} from '../MoneySheetOptionsList';
import styleSheet from './MoneyAddMoneySheet.styles';
import { MoneyAddMoneySheetTestIds } from './MoneyAddMoneySheet.testIds';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';
import { rejectPendingTransactions } from '../../utils/rejectPendingTransactions';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { moneyFormatUsd } from '../../utils/moneyFormatFiat';

const log = createProjectLogger('money-add-money-sheet');

const MoneyAddMoneySheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet, {});

  const {
    fiatBalanceAggregated,
    hasMusdBalanceOnAnyChain,
    tokenBalanceAggregated,
    tokenBalanceByChain,
  } = useMusdBalance();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const { enabledTransactionTypes } = useMMPayFiatConfig();
  const hasAnyCryptoBalance = useSelector(selectHasAnyNonZeroTokenBalance);
  const hasPendingTransaction = useSelector(selectHasUnapprovedTransactions);
  // Derive the deposit asset (CAIP-19) from the same vault config the deposit
  // flow uses, so the entry gate checks the exact asset the deposit targets.
  const depositAssetId = useMoneyAccountDepositAssetId();
  const regionHasFiatProvider = useRegionHasFiatProvider(depositAssetId);
  const isFiatDepositEnabled = useMemo(
    () => enabledTransactionTypes.includes(TransactionType.moneyAccountDeposit),
    [enabledTransactionTypes],
  );
  const canDepositFiat = isFiatDepositEnabled && regionHasFiatProvider;

  const { trackBottomSheetViewed, trackSurfaceClicked } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_ADD_MONEY_SHEET,
  });

  useMountEffect(trackBottomSheetViewed);

  // When a deposit is requested while a stale transaction is still pending, we
  // reject it and stash the requested options here until it clears — see the
  // effect below.
  const [deferredDeposit, setDeferredDeposit] = useState<{
    options?: InitiateDepositOptions;
  } | null>(null);

  // Close the sheet (which pops the modal) and kick off the deposit in one
  // atomic step, so the confirmation slides straight over the sheet rather than
  // flashing back to Money home in between.
  const closeAndStartDeposit = useCallback(
    (options?: InitiateDepositOptions) => {
      sheetRef.current?.onCloseBottomSheet(() => {
        initiateDeposit(options).catch(() => undefined);
      });
    },
    [initiateDeposit],
  );

  // A leftover unapproved transaction would be picked up by the confirmation
  // screen, so we reject it before opening a fresh one. Rejection clears from
  // state asynchronously and closing the sheet unmounts us, so when something is
  // pending we stay mounted and defer the close+navigate (see effect) instead of
  // letting it race the unmount.
  const startDeposit = useCallback(
    (options?: InitiateDepositOptions) => {
      if (hasPendingTransaction) {
        log('Rejecting pending transaction before starting deposit');
        rejectPendingTransactions();
        setDeferredDeposit({ options });
        return;
      }
      closeAndStartDeposit(options);
    },
    [hasPendingTransaction, closeAndStartDeposit],
  );

  useEffect(() => {
    if (!deferredDeposit || hasPendingTransaction) {
      return;
    }
    log('Pending transaction cleared; starting deposit');
    // `closeAndStartDeposit` is re-created once the pending transaction clears,
    // so this runs the up-to-date deposit/navigation, not a stale snapshot.
    closeAndStartDeposit(deferredDeposit.options);
    setDeferredDeposit(null);
  }, [deferredDeposit, hasPendingTransaction, closeAndStartDeposit]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleConvertCrypto = useCallback(() => {
    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_ADD_MONEY_SHEET_CONVERT_CRYPTO,
      redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
    });

    startDeposit({ intent: 'convert' });
  }, [startDeposit, trackSurfaceClicked]);

  const handleDepositFunds = useCallback(() => {
    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_ADD_MONEY_SHEET_DEPOSIT_FUNDS,
      redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
    });

    startDeposit({ autoSelectFiatPayment: true, intent: 'card' });
  }, [startDeposit, trackSurfaceClicked]);

  const parsedMusdFiat = Number(fiatBalanceAggregated);
  const hasParsedFiatBalance =
    Number.isFinite(parsedMusdFiat) && parsedMusdFiat > 0;
  const hasMusdBalance = hasMusdBalanceOnAnyChain || hasParsedFiatBalance;

  const handleMoveMusd = useCallback(() => {
    // With no mUSD anywhere there is nothing to move, so the row funds the
    // money account through the MM Pay fiat deposit (debit card / Apple Pay)
    // instead — the money account is only ever funded via MM Pay, never the
    // standalone Ramps flow.
    if (!hasMusdBalance) {
      trackSurfaceClicked({
        component_name: COMPONENT_NAMES.MONEY_ADD_MONEY_SHEET_MOVE_MUSD,
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
      });

      startDeposit({ autoSelectFiatPayment: true, intent: 'card' });
      return;
    }

    let sourceChainId: Hex = MUSD_CONVERSION_DEFAULT_CHAIN_ID;
    let bestBalance = new BigNumber(0);
    for (const [chainId, balance] of Object.entries(
      tokenBalanceByChain ?? {},
    )) {
      const candidate = new BigNumber(balance ?? 0);
      if (candidate.isGreaterThan(bestBalance)) {
        sourceChainId = chainId as Hex;
        bestBalance = candidate;
      }
    }

    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_ADD_MONEY_SHEET_MOVE_MUSD,
      redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
    });

    startDeposit({
      intent: 'addMusd',
      preferredPaymentToken: {
        address: MUSD_TOKEN_ADDRESS_BY_CHAIN[sourceChainId],
        chainId: sourceChainId,
      },
    });
  }, [hasMusdBalance, startDeposit, tokenBalanceByChain, trackSurfaceClicked]);

  const moveMusdAmount = useMemo(
    () => moneyFormatUsd(new BigNumber(tokenBalanceAggregated)),
    [tokenBalanceAggregated],
  );
  // Mask only the amount; keep the mUSD symbol visible in privacy mode.
  const moveMusdLabel: MoneySheetOption['label'] = hasMusdBalance
    ? { maskedText: moveMusdAmount, suffix: MUSD_TOKEN.symbol }
    : strings('money.add_money_sheet.add_musd');

  const baseOptions: MoneySheetOption[] = [
    {
      label: strings('money.add_money_sheet.convert_crypto'),
      icon: IconName.Refresh,
      onPress: handleConvertCrypto,
      testID: MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
      disabled: !hasAnyCryptoBalance,
    },
    ...(canDepositFiat
      ? [
          {
            label: strings(
              Platform.OS === 'android'
                ? 'fiat_on_ramp.debit_card'
                : 'money.add_money_sheet.deposit_funds',
            ),
            icon: IconName.Card,
            onPress: handleDepositFunds,
            testID: MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
          },
        ]
      : []),
  ];

  const options: MoneySheetOption[] = [
    ...baseOptions,
    {
      label: moveMusdLabel,
      icon: IconName.Add,
      onPress: handleMoveMusd,
      testID: MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION,
      // Without mUSD the row falls back to the MM Pay fiat deposit, so it is
      // only actionable when that flow is available.
      disabled: !hasMusdBalance && !canDepositFiat,
    },
    {
      label: strings('money.add_money_sheet.bank_account'),
      icon: IconName.Bank,
      testID: MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW,
      disabled: true,
      comingSoon: true,
    },
    {
      label: strings('money.add_money_sheet.receive_external'),
      icon: IconName.QrCode,
      testID: MoneyAddMoneySheetTestIds.RECEIVE_EXTERNAL_ROW,
      disabled: true,
      comingSoon: true,
    },
  ];

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyAddMoneySheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('money.add_money_sheet.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.list}>
        <MoneySheetOptionsList options={options} />
      </View>
    </BottomSheet>
  );
};

export default MoneyAddMoneySheet;
