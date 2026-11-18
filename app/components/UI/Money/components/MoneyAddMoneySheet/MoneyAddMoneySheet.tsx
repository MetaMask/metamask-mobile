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
import { createProjectLogger } from '@metamask/utils';
import {
  BottomSheet,
  type BottomSheetRef,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useQuickDepositStablecoins } from '../../hooks/useQuickDepositStablecoins';
import {
  useMoneyAccountDeposit,
  type InitiateDepositOptions,
} from '../../hooks/useMoneyAccount';
import { useMMPayFiatConfig } from '../../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';
import { useRegionHasFiatProvider } from '../../../Ramp/hooks/useRegionHasFiatProvider';
import { useMoneyAccountDepositAssetId } from '../../hooks/useMoneyAccountDepositAssetId';
import { selectHasUnapprovedTransactions } from '../../../../../selectors/transactionController';
import { selectHasAnyNonZeroTokenBalance } from '../../../../../selectors/tokenBalancesController';
import { selectUsableVbaAutoramp } from '../../../../../selectors/rampsController';
import { openVbaEntry } from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting';
import { startVbaCufJourney } from '../../../Ramp/Views/VirtualBankAccount/vbaCufTrace';
import { VBA_CUF_ENTRY_SURFACE } from '../../../Ramp/Views/VirtualBankAccount/vbaCufTags';
import { useVbaEligibility } from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaEligibility';
import { getBankAccountEntryVisibility } from '../../utils/getBankAccountEntryVisibility';
import { useParams } from '../../../../../util/navigation/navUtils';
import type { MoneyAddMoneySheetParams } from '../../types/navigation';
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
import { useMoneyAccountAccessRedirect } from '../../hooks/useMoneyAccountAvailability';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

const log = createProjectLogger('money-add-money-sheet');

const MoneyAddMoneySheetContent: React.FC = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { launchedFrom } = useParams<MoneyAddMoneySheetParams>();
  const { styles } = useStyles(styleSheet, {});

  const quickDepositStablecoins = useQuickDepositStablecoins();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const { enabledTransactionTypes } = useMMPayFiatConfig();
  const hasAnyCryptoBalance = useSelector(selectHasAnyNonZeroTokenBalance);
  const hasPendingTransaction = useSelector(selectHasUnapprovedTransactions);
  // Flag, min version, supported IP geolocation, and the dev bypass.
  const vbaEligibility = useVbaEligibility();
  const usableVbaAutoramp = useSelector(selectUsableVbaAutoramp);
  const bankAccountVisibility = getBankAccountEntryVisibility({
    ...vbaEligibility,
    hasUsableAutoramp: Boolean(usableVbaAutoramp),
  });
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
      // Applied here rather than per row so every funding method inherits the
      // caller's launch source.
      const depositOptions = launchedFrom
        ? { ...options, launchedFrom }
        : options;
      if (hasPendingTransaction) {
        log('Rejecting pending transaction before starting deposit');
        rejectPendingTransactions();
        setDeferredDeposit({ options: depositOptions });
        return;
      }
      closeAndStartDeposit(depositOptions);
    },
    [hasPendingTransaction, closeAndStartDeposit, launchedFrom],
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

  const handleBankAccount = useCallback(() => {
    startVbaCufJourney(VBA_CUF_ENTRY_SURFACE.ADD_MONEY_SHEET);
    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_ADD_MONEY_SHEET_BANK_ACCOUNT,
      redirect_target: SCREEN_NAMES.VBA_ONBOARDING,
    });

    // Not part of the crypto deposit flow, so it bypasses startDeposit.
    // An approved account opens its details directly. Otherwise the loading
    // screen hydrates and replaces itself with the first incomplete module.
    sheetRef.current?.onCloseBottomSheet(() => {
      openVbaEntry(navigation);
    });
  }, [navigation, trackSurfaceClicked]);

  const handleDepositFunds = useCallback(() => {
    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_ADD_MONEY_SHEET_DEPOSIT_FUNDS,
      redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
    });

    startDeposit({ autoSelectFiatPayment: true, intent: 'card' });
  }, [startDeposit, trackSurfaceClicked]);

  const depositHeldStablecoin = useCallback(
    (option: (typeof quickDepositStablecoins)[number]) => {
      trackSurfaceClicked({
        component_name: COMPONENT_NAMES.MONEY_ADD_MONEY_SHEET_MOVE_STABLECOIN,
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
        deposit_intent: option.intent,
        deposit_token_symbol: option.symbol,
        deposit_token_chain_id: option.preferredPaymentToken.chainId,
      });

      startDeposit({
        intent: option.intent,
        preferredPaymentToken: option.preferredPaymentToken,
      });
    },
    [startDeposit, trackSurfaceClicked],
  );

  // Live row (eligible): promoted to the top. Coming-soon row (flag off):
  // keeps its pre-flag position further down. Hidden (flag on but not
  // eligible, or region still loading): omitted.
  const bankAccountBaseOption: Pick<
    MoneySheetOption,
    'label' | 'icon' | 'testID'
  > = {
    label: strings('money.add_money_sheet.bank_account'),
    icon: IconName.Bank,
    testID: MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW,
  };
  const enabledBankAccountOptions: MoneySheetOption[] =
    bankAccountVisibility === 'enabled'
      ? [
          {
            ...bankAccountBaseOption,
            onPress: handleBankAccount,
            newBadge: true,
          },
        ]
      : [];
  const comingSoonBankAccountOptions: MoneySheetOption[] =
    bankAccountVisibility === 'coming-soon'
      ? [{ ...bankAccountBaseOption, disabled: true, comingSoon: true }]
      : [];

  const baseOptions: MoneySheetOption[] = [
    ...enabledBankAccountOptions,
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

  const stablecoinOptions: MoneySheetOption[] = quickDepositStablecoins.map(
    (option) => ({
      label: {
        maskedText: moneyFormatUsd(new BigNumber(option.aggregatedBalance)),
        suffix: option.symbol,
      },
      icon: IconName.Add,
      onPress: () => depositHeldStablecoin(option),
      testID: MoneyAddMoneySheetTestIds.MOVE_STABLECOIN_OPTION,
    }),
  );

  const options: MoneySheetOption[] = [
    ...baseOptions,
    ...stablecoinOptions,
    ...comingSoonBankAccountOptions,
  ];

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyAddMoneySheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
      >
        <Text variant={TextVariant.HeadingSm}>
          {strings('money.add_money_sheet.title')}
        </Text>
      </BottomSheetHeaderGlass>
      <View style={styles.list}>
        <MoneySheetOptionsList options={options} />
      </View>
    </BottomSheet>
  );
};

const MoneyAddMoneySheet: React.FC = () => {
  const isMoneyAccountAccessible = useMoneyAccountAccessRedirect();

  if (!isMoneyAccountAccessible) {
    return null;
  }

  return <MoneyAddMoneySheetContent />;
};

export default MoneyAddMoneySheet;
