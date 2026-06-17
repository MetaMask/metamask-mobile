import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { providerErrors } from '@metamask/rpc-errors';
import { createProjectLogger, Hex } from '@metamask/utils';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  IconColor,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Tag from '../../../../../component-library/components/Tags/Tag';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';
import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../../Earn/constants/musd';
import Engine from '../../../../../core/Engine';
import {
  useMoneyAccountDeposit,
  type InitiateDepositOptions,
} from '../../hooks/useMoneyAccount';
import { useMMPayFiatConfig } from '../../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';
import { selectTransactions } from '../../../../../selectors/transactionController';
import { selectHasAnyNonZeroTokenBalance } from '../../../../../selectors/tokenBalancesController';
import { useHasNativeFiatProvider } from '../../../Ramp/hooks/useHasNativeFiatProvider';
import {
  getRampRoutingDecision,
  UnifiedRampRoutingType,
} from '../../../../../reducers/fiatOrders';
import styleSheet from './MoneyAddMoneySheet.styles';
import { MoneyAddMoneySheetTestIds } from './MoneyAddMoneySheet.testIds';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';

const log = createProjectLogger('money-add-money-sheet');

interface Option {
  label: string;
  icon: IconName;
  onPress: () => void;
  testID: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

const MoneyAddMoneySheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const surfaceClass = useElevatedSurface();

  const {
    fiatBalanceAggregated,
    fiatBalanceAggregatedFormatted,
    hasMusdBalanceOnAnyChain,
    tokenBalanceAggregated,
    tokenBalanceByChain,
  } = useMusdBalance();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const { enabledTransactionTypes } = useMMPayFiatConfig();
  const hasAnyCryptoBalance = useSelector(selectHasAnyNonZeroTokenBalance);
  const rampRoutingDecision = useSelector(getRampRoutingDecision);
  const hasNativeFiatProvider = useHasNativeFiatProvider();
  const transactions = useSelector(selectTransactions);
  const isFiatDepositEnabled = useMemo(
    () => enabledTransactionTypes.includes(TransactionType.moneyAccountDeposit),
    [enabledTransactionTypes],
  );

  const { trackBottomSheetViewed, trackSurfaceClicked } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_ADD_MONEY_SHEET,
  });

  useMountEffect(trackBottomSheetViewed);

  const hasPendingTransaction = useMemo(
    () =>
      (transactions ?? []).some(
        (tx) => tx.status === TransactionStatus.unapproved,
      ),
    [transactions],
  );

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
        rejectPendingTransactions(transactions ?? []);
        setDeferredDeposit({ options });
        return;
      }
      closeAndStartDeposit(options);
    },
    [hasPendingTransaction, transactions, closeAndStartDeposit],
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

    startDeposit();
  }, [startDeposit, trackSurfaceClicked]);

  const handleDepositFunds = useCallback(() => {
    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_ADD_MONEY_SHEET_DEPOSIT_FUNDS,
      redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
    });

    startDeposit({ autoSelectFiatPayment: true });
  }, [startDeposit, trackSurfaceClicked]);

  const handleMoveMusd = useCallback(() => {
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
  }, [startDeposit, tokenBalanceByChain, trackSurfaceClicked]);

  const parsedMusdFiat = Number(fiatBalanceAggregated);
  const hasParsedFiatBalance =
    Number.isFinite(parsedMusdFiat) && parsedMusdFiat > 0;
  const hasMusdBalance = hasMusdBalanceOnAnyChain || hasParsedFiatBalance;

  const moveMusdAmount = hasParsedFiatBalance
    ? fiatBalanceAggregatedFormatted
    : new BigNumber(tokenBalanceAggregated).toFixed(2);
  const moveMusdLabel = hasMusdBalance
    ? strings('money.add_money_sheet.move_musd', { amount: moveMusdAmount })
    : strings('money.add_money_sheet.add_musd');

  const baseOptions: Option[] = [
    {
      label: strings('money.add_money_sheet.convert_crypto'),
      icon: IconName.Refresh,
      onPress: handleConvertCrypto,
      testID: MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
      disabled: !hasAnyCryptoBalance,
    },
    ...(isFiatDepositEnabled &&
    rampRoutingDecision !== UnifiedRampRoutingType.UNSUPPORTED
      ? [
          {
            label: strings('money.add_money_sheet.deposit_funds'),
            icon: IconName.Bank,
            onPress: handleDepositFunds,
            testID: MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
            disabled: !hasNativeFiatProvider,
            comingSoon: !hasNativeFiatProvider,
          },
        ]
      : []),
  ];

  const options: Option[] = [
    ...baseOptions,
    {
      label: moveMusdLabel,
      icon: IconName.Add,
      onPress: handleMoveMusd,
      testID: MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION,
      disabled: !hasMusdBalance,
    },
  ];

  const orderedOptions: Option[] = [
    ...options.filter((option) => !option.disabled),
    ...options.filter((option) => option.disabled),
  ];

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyAddMoneySheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
      twClassName={surfaceClass}
    >
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('money.add_money_sheet.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.list}>
        {orderedOptions.map((item) => (
          <TouchableOpacity
            key={item.testID}
            disabled={item.disabled}
            onPress={item.disabled ? undefined : item.onPress}
            style={styles.row}
            testID={item.testID}
          >
            <Icon
              name={item.icon}
              size={IconSize.Lg}
              color={
                item.disabled ? IconColor.IconMuted : IconColor.IconDefault
              }
            />
            {item.comingSoon ? (
              <View style={styles.disabledRowContent}>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                >
                  {item.label}
                </Text>
                <Tag
                  label={strings('money.add_money_sheet.coming_soon')}
                  style={styles.comingSoonTag}
                />
              </View>
            ) : (
              <View style={styles.rowLabelContainer}>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={item.disabled ? TextColor.TextAlternative : undefined}
                >
                  {item.label}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
        <View
          style={styles.row}
          testID={MoneyAddMoneySheetTestIds.RECEIVE_EXTERNAL_ROW}
        >
          <Icon
            name={IconName.Arrow2Down}
            size={IconSize.Lg}
            color={IconColor.IconMuted}
          />
          <View style={styles.disabledRowContent}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {strings('money.add_money_sheet.receive_external')}
            </Text>
            <Tag
              label={strings('money.add_money_sheet.coming_soon')}
              style={styles.comingSoonTag}
            />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
};

function rejectPendingTransactions(transactions: TransactionMeta[]) {
  const { ApprovalController } = Engine.context;

  for (const tx of transactions) {
    if (tx.status !== TransactionStatus.unapproved) {
      continue;
    }
    try {
      ApprovalController.rejectRequest(
        tx.id,
        providerErrors.userRejectedRequest(),
      );
      log('Rejected transaction', tx.type, tx.id);
    } catch {
      log('Failed to reject transaction', tx.type, tx.id);
    }
  }
}

export default MoneyAddMoneySheet;
