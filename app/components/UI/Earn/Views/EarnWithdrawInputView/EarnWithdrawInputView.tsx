import { Hex } from '@metamask/utils';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import Routes from '../../../../../constants/navigation/Routes';
import { RootState } from '../../../../../reducers';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { selectConversionRate } from '../../../../../selectors/currencyRateController';
import { selectConfirmationRedesignFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { selectContractExchangeRatesByChainId } from '../../../../../selectors/tokenRatesController';
import Keypad from '../../../../Base/Keypad';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { useStyles } from '../../../../hooks/useStyles';
import useEarnWithdrawInput from '../../../Earn/hooks/useEarnWithdrawInput';
import { getStakingNavbar } from '../../../Navbar';
import ScreenLayout from '../../../Ramp/Aggregator/components/ScreenLayout';
import QuickAmounts from '../../../Stake/components/QuickAmounts';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';
import usePoolStakedUnstake from '../../../Stake/hooks/usePoolStakedUnstake';
import EarnTokenSelector from '../../components/EarnTokenSelector';
import InputDisplay from '../../components/InputDisplay';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import {
  calculateAaveV3HealthFactorAfterWithdrawal,
  CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS,
  getAaveV3MaxRiskAwareWithdrawalAmount,
} from '../../utils/tempLending';
import { EARN_INPUT_VIEW_ACTIONS } from '../EarnInputView/EarnInputView.types';
import styleSheet from './EarnWithdrawInputView.styles';
import BN from 'bnjs4';
import { renderFromTokenMinimalUnit } from '../../../../../util/number';
import { TokenI } from '../../../Tokens/types';
import useEarnTokens from '../../hooks/useEarnTokens';
import { EarnTokenDetails } from '../../types/lending.types';
import { useEarnAnalyticsEventLogging } from '../../hooks/useEarnEventAnalyticsLogging';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import { ScrollView } from 'react-native-gesture-handler';
import { trace, TraceName } from '../../../../../util/trace';
import useEndTraceOnMount from '../../../../hooks/useEndTraceOnMount';
import { EVM_SCOPE } from '../../constants/networks';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../../../util/navigation/types';

type EarnWithdrawInputViewProps = StackScreenProps<RootParamList, 'Unstake'>;

const EarnWithdrawInputView = ({ route }: EarnWithdrawInputViewProps) => {
  const { token } = route.params;

  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );
  const { getPairedEarnTokens } = useEarnTokens();
  const { outputToken: receiptToken } = getPairedEarnTokens(token);

  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { attemptUnstakeTransaction } = usePoolStakedUnstake();
  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );
  const confirmationRedesignFlags = useSelector(
    selectConfirmationRedesignFlags,
  );

  const conversionRate = useSelector(selectConversionRate) ?? 1;
  const contractExchangeRates = useSelector((state: RootState) =>
    selectContractExchangeRatesByChainId(state, token?.chainId as Hex),
  );
  const network = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, token.chainId as Hex),
  );

  // We want to keep track of the last quick amount pressed before navigating to review.
  const lastQuickAmountButtonPressed = useRef<string | null>(null);
  const exchangeRate = contractExchangeRates?.[token?.address as Hex]?.price;

  const { trackEvent, createEventBuilder } = useMetrics();

  const { shouldLogStablecoinEvent, shouldLogStakingEvent } =
    useEarnAnalyticsEventLogging({
      // Do we want to track the earnToken/underlying (e.g. USDC) or the receiptToken (e.g. aUSDC)?
      earnToken: receiptToken,
      isStablecoinLendingEnabled,
      token,
      actionType: 'withdrawal',
    });

  const {
    isFiat,
    currentCurrency,
    isNonZeroAmount,
    amountToken,
    amountTokenMinimalUnit,
    amountFiatNumber,
    isOverMaximum,
    handleCurrencySwitch,
    currencyToggleValue,
    percentageOptions,
    handleQuickAmountPress,
    handleKeypadChange,
    earnBalanceValue,
  } = useEarnWithdrawInput({
    earnToken: receiptToken as EarnTokenDetails,
    conversionRate,
    exchangeRate,
  });

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.EARN_INPUT_OPENED)
        .addProperties({
          action_type: 'withdrawal',
          token: receiptToken?.symbol,
          token_name: receiptToken?.name,
          network: network?.name,
          user_token_balance: receiptToken?.balanceFormatted,
          experience: receiptToken?.experience?.type,
        })
        .build(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEndTraceOnMount(TraceName.EarnWithdrawScreen);

  const [maxRiskAwareWithdrawalAmount, setMaxRiskAwareWithdrawalAmount] =
    useState<string | undefined>(undefined);
  const [
    isLoadingMaxSafeWithdrawalAmount,
    setIsLoadingMaxSafeWithdrawalAmount,
  ] = useState(false);

  // For lending withdrawals, fetch AAVE pool metadata once on render.
  useEffect(() => {
    if (
      receiptToken?.experience?.type !== EARN_EXPERIENCES.STABLECOIN_LENDING ||
      !selectedAccount?.address ||
      !receiptToken?.address ||
      !receiptToken?.chainId
    )
      return;
    setMaxRiskAwareWithdrawalAmount(undefined);

    setIsLoadingMaxSafeWithdrawalAmount(true);

    getAaveV3MaxRiskAwareWithdrawalAmount(
      selectedAccount.address,
      receiptToken as EarnTokenDetails,
    )
      .then((maxAmount) => {
        setMaxRiskAwareWithdrawalAmount(maxAmount);
      })
      .finally(() => {
        setIsLoadingMaxSafeWithdrawalAmount(false);
      });
    // Call once on render and only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    receiptToken?.experience?.type,
    selectedAccount?.address,
    receiptToken?.address,
    receiptToken?.chainId,
  ]);

  const stakedBalanceText = strings('stake.staked_balance');

  const stakingNavBarOptions = {
    hasCancelButton: true,
    hasBackButton: false,
  };
  const stakingNavBarEventOptions = {
    cancelButtonEvent: {
      event: MetaMetricsEvents.UNSTAKE_CANCEL_CLICKED,
      properties: {
        selected_provider: EVENT_PROVIDERS.CONSENSYS,
        location: EVENT_LOCATIONS.UNSTAKE_INPUT_VIEW,
      },
    },
  };
  const earnNavBarOptions = {
    hasCancelButton: false,
    hasBackButton: true,
    // TODO: https://consensyssoftware.atlassian.net/browse/STAKE-903
    hasIconButton: !isStablecoinLendingEnabled,
    // TODO: https://consensyssoftware.atlassian.net/browse/STAKE-903
    // handleIconPress: ???,
  };
  const backButtonAnalytics = shouldLogStablecoinEvent()
    ? {
        event: MetaMetricsEvents.EARN_INPUT_BACK_BUTTON_CLICKED,
        experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
        location: EVENT_LOCATIONS.EARN_WITHDRAWAL_INPUT_VIEW,
      }
    : {
        event: MetaMetricsEvents.UNSTAKE_CANCEL_CLICKED,
        experience: EARN_EXPERIENCES.POOLED_STAKING,
        location: EVENT_LOCATIONS.UNSTAKE_INPUT_VIEW,
      };

  const earnNavBarEventOptions = {
    backButtonEvent: {
      event: backButtonAnalytics.event,
      properties: {
        selected_provider: EVENT_PROVIDERS.CONSENSYS,
        location: backButtonAnalytics.location,
        experience: backButtonAnalytics.experience,
        token: token.symbol,
      },
    },
    // TODO: https://consensyssoftware.atlassian.net/browse/STAKE-903
    // iconButtonEvent: {
    //   event: MetaMetricsEvents.TOOLTIP_OPENED,
    //   properties: {
    //     selected_provider: EVENT_PROVIDERS.CONSENSYS,
    //     text: 'Tooltip Opened',
    //     location: EVENT_LOCATIONS.UNSTAKE_CANCEL_CLICKED,
    //     tooltip_name: '???',
    //   },
    // },
  };
  const navBarOptions = isStablecoinLendingEnabled
    ? earnNavBarOptions
    : stakingNavBarOptions;
  const navBarEventOptions = isStablecoinLendingEnabled
    ? earnNavBarEventOptions
    : stakingNavBarEventOptions;

  useEffect(() => {
    navigation.setOptions(
      getStakingNavbar(
        strings('earn.withdraw'),
        navigation,
        theme.colors,
        navBarOptions,
        navBarEventOptions,
      ),
    );
  }, [navigation, theme.colors, navBarOptions, navBarEventOptions]);

  // This component rerenders to recalculate gas estimate which causes duplicate events to fire.
  // This ref will allow one insufficient funds error to fire per visit to the page.
  const isSendingInsufficientFundsMetaMetric = useRef(false);

  useEffect(() => {
    const emitInsufficientFundsMetaMetric = () => {
      // track insufficient balance for stablecoin lending withdrawals
      if (shouldLogStablecoinEvent()) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.EARN_INPUT_INSUFFICIENT_BALANCE)
            .addProperties({
              provider: EVENT_PROVIDERS.CONSENSYS,
              location: EVENT_LOCATIONS.EARN_WITHDRAWAL_INPUT_VIEW,
              token_name: token.name,
              token: token.symbol,
              network: network?.name,
              experience: receiptToken?.experience?.type,
              action_type: 'withdrawal',
            })
            .build(),
        );
      }
    };

    if (
      isOverMaximum.isOverMaximumEth ||
      (isOverMaximum.isOverMaximumToken &&
        !isSendingInsufficientFundsMetaMetric.current)
    ) {
      isSendingInsufficientFundsMetaMetric.current = true;
      emitInsufficientFundsMetaMetric();
    }
  }, [
    shouldLogStablecoinEvent,
    createEventBuilder,
    receiptToken?.experience?.type,
    isOverMaximum?.isOverMaximumEth,
    isOverMaximum?.isOverMaximumToken,
    network?.name,
    token.chainId,
    token.name,
    token.symbol,
    trackEvent,
  ]);

  const [
    isSubmittingStakeWithdrawalTransaction,
    setIsSubmittingStakeWithdrawalTransaction,
  ] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setIsSubmittingStakeWithdrawalTransaction(false);
    }, []),
  );

  const handleLendingWithdrawalFlow = useCallback(async () => {
    trace({ name: TraceName.EarnWithdrawReviewScreen });

    if (shouldLogStablecoinEvent()) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.EARN_REVIEW_BUTTON_CLICKED)
          .addProperties({
            action_type: 'withdrawal',
            token: receiptToken?.symbol,
            network: network?.name,
            user_token_balance: receiptToken?.balanceFormatted,
            transaction_value: `${amountToken} ${receiptToken?.symbol}`,
            lastQuickAmountButtonPressed: lastQuickAmountButtonPressed.current,
            experience: receiptToken?.experience?.type,
          })
          .build(),
      );
    }

    // TODO: https://consensyssoftware.atlassian.net/browse/STAKE-1044
    // We likely want to inform the user if this data is missing and the withdrawal fails.
    if (
      !selectedAccount?.address ||
      !receiptToken?.experience?.market?.underlying.address ||
      !receiptToken?.address ||
      !receiptToken?.chainId
    )
      return;

    const simulatedHealthFactorAfterWithdrawal =
      await calculateAaveV3HealthFactorAfterWithdrawal(
        selectedAccount.address,
        amountTokenMinimalUnit.toString(),
        receiptToken as EarnTokenDetails,
      );

    setIsSubmittingStakeWithdrawalTransaction(true);

    const amountToWithdraw = amountTokenMinimalUnit.toString();

    try {
      const lendingPoolContractAddress =
        CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS[receiptToken.chainId] ?? '';

      navigation.navigate(Routes.EARN.ROOT, {
        screen: Routes.EARN.LENDING_WITHDRAWAL_CONFIRMATION,
        params: {
          token: receiptToken,
          amountTokenMinimalUnit: amountToWithdraw,
          amountFiat: amountFiatNumber,
          lendingProtocol: receiptToken.experience?.market?.protocol,
          lendingContractAddress: lendingPoolContractAddress,
          healthFactorSimulation: simulatedHealthFactorAfterWithdrawal,
        },
      });
    } catch (e) {
      setIsSubmittingStakeWithdrawalTransaction(false);
    }
  }, [
    shouldLogStablecoinEvent,
    selectedAccount?.address,
    amountFiatNumber,
    amountToken,
    amountTokenMinimalUnit,
    createEventBuilder,
    navigation,
    network?.name,
    receiptToken,
    trackEvent,
  ]);

  const handleUnstakeWithdrawalFlow = useCallback(async () => {
    const isStakingDepositRedesignedEnabled =
      confirmationRedesignFlags?.staking_confirmations;

    const unstakeButtonClickEventProperties = {
      selected_provider: EVENT_PROVIDERS.CONSENSYS,
      tokens_to_stake_native_value: amountToken,
      tokens_to_stake_usd_value: amountFiatNumber,
      lastQuickAmountButtonPressed: lastQuickAmountButtonPressed.current,
      network: network?.name,
      experience: EARN_EXPERIENCES.POOLED_STAKING,
    };

    if (isStakingDepositRedesignedEnabled) {
      // start trace between user initiating withdrawal and the redesigned confirmation screen loading
      trace({
        name: TraceName.EarnWithdrawConfirmationScreen,
        data: { experience: EARN_EXPERIENCES.POOLED_STAKING },
      });

      // this prevents the user from adding the transaction withdrawal into the
      // controller state multiple times
      setIsSubmittingStakeWithdrawalTransaction(true);

      // Here we add the transaction to the transaction controller. The
      // redesigned confirmations architecture relies on the transaction
      // metadata object being defined by the time the confirmation is displayed
      // to the user.
      await attemptUnstakeTransaction(
        amountTokenMinimalUnit.toString(),
        selectedAccount?.address as string,
      );

      navigation.navigate('StakeScreens', {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        params: {
          amountWei: amountTokenMinimalUnit.toString(),
          amountFiat: amountFiatNumber,
        },
      });

      const withRedesignedPropEventProperties = {
        ...unstakeButtonClickEventProperties,
        is_redesigned: true,
      };

      trackEvent(
        createEventBuilder(MetaMetricsEvents.REVIEW_UNSTAKE_BUTTON_CLICKED)
          .addProperties(withRedesignedPropEventProperties)
          .build(),
      );

      return;
    }

    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.UNSTAKE_CONFIRMATION,
      params: {
        amountWei: amountTokenMinimalUnit.toString(),
        amountFiat: amountFiatNumber,
      },
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.REVIEW_UNSTAKE_BUTTON_CLICKED)
        .addProperties(unstakeButtonClickEventProperties)
        .build(),
    );
  }, [
    selectedAccount?.address,
    amountFiatNumber,
    amountToken,
    amountTokenMinimalUnit,
    attemptUnstakeTransaction,
    confirmationRedesignFlags?.staking_confirmations,
    createEventBuilder,
    navigation,
    network?.name,
    trackEvent,
  ]);

  // TODO: access primary experience a better way
  // TODO: think about if we could rely on receiptToken experience instead here
  // should we be able to, consider the implications of not being able to
  const handleWithdrawPress = useCallback(async () => {
    if (
      receiptToken?.experience?.type === EARN_EXPERIENCES.STABLECOIN_LENDING
    ) {
      return handleLendingWithdrawalFlow();
    }

    if (receiptToken?.experience?.type === EARN_EXPERIENCES.POOLED_STAKING) {
      return handleUnstakeWithdrawalFlow();
    }
  }, [
    receiptToken?.experience?.type,
    handleLendingWithdrawalFlow,
    handleUnstakeWithdrawalFlow,
  ]);

  /**
   * Displayed when user has borrow positions detected outside the wallet
   * If a user has debt they won't be able to withdraw their full collateral or they'd risk liquidation.
   *
   * Does not display message for users that only supply and withdraw within MM since they'd have no debt
   */
  const maxRiskAwareWithdrawalText = useMemo(() => {
    if (isLoadingMaxSafeWithdrawalAmount) return;

    // We don't want to display the max safe withdrawal text if it isn't applicable.
    if (maxRiskAwareWithdrawalAmount === receiptToken?.balanceMinimalUnit)
      return;

    if (!maxRiskAwareWithdrawalAmount) {
      return;
    }

    return renderFromTokenMinimalUnit(
      maxRiskAwareWithdrawalAmount,
      receiptToken?.decimals as number,
    );
  }, [
    isLoadingMaxSafeWithdrawalAmount,
    maxRiskAwareWithdrawalAmount,
    receiptToken?.balanceMinimalUnit,
    receiptToken?.decimals,
  ]);

  const isWithdrawingMoreThanAvailableForLendingToken = useMemo(() => {
    // This check only applies to lending experience.
    if (
      receiptToken?.experience?.type !== EARN_EXPERIENCES.STABLECOIN_LENDING
    ) {
      return false;
    }

    if (!maxRiskAwareWithdrawalAmount) {
      return false;
    }

    return new BN(amountTokenMinimalUnit).gt(
      new BN(maxRiskAwareWithdrawalAmount),
    );
  }, [
    amountTokenMinimalUnit,
    receiptToken?.experience?.type,
    maxRiskAwareWithdrawalAmount,
  ]);

  const buttonLabel = useMemo(() => {
    if (!isNonZeroAmount) {
      return strings('stake.enter_amount');
    }
    if (isOverMaximum.isOverMaximumToken) {
      return strings('stake.not_enough_token', {
        ticker: receiptToken?.ticker ?? receiptToken?.symbol ?? '',
      });
    }
    if (isOverMaximum.isOverMaximumEth) {
      return strings('stake.not_enough_eth');
    }

    if (isWithdrawingMoreThanAvailableForLendingToken) {
      return strings('earn.amount_exceeds_safe_withdrawal_limit');
    }

    return strings('stake.review');
  }, [
    isNonZeroAmount,
    isOverMaximum.isOverMaximumToken,
    isOverMaximum.isOverMaximumEth,
    isWithdrawingMoreThanAvailableForLendingToken,
    receiptToken?.ticker,
    receiptToken?.symbol,
  ]);

  const handleCurrencySwitchWithTracking = useCallback(() => {
    // Call the original handler first
    handleCurrencySwitch();

    // Track events based on flow type
    if (shouldLogStablecoinEvent()) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.EARN_INPUT_CURRENCY_SWITCH_CLICKED)
          .addProperties({
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            text: 'Currency Switch Clicked',
            location: EVENT_LOCATIONS.EARN_WITHDRAWAL_INPUT_VIEW,
            // We want to track the currency switching to. Not the current currency.
            currency_type: isFiat ? 'native' : 'fiat',
            experience: receiptToken?.experience?.type,
          })
          .build(),
      );
    } else if (shouldLogStakingEvent()) {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.UNSTAKE_INPUT_CURRENCY_SWITCH_CLICKED,
        )
          .addProperties({
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            text: 'Currency Switch Trigger',
            location: EVENT_LOCATIONS.UNSTAKE_INPUT_VIEW,
            // We want to track the currency switching to. Not the current currency.
            currency_type: isFiat ? 'native' : 'fiat',
            experience: receiptToken?.experience?.type,
          })
          .build(),
      );
    }
  }, [
    handleCurrencySwitch,
    shouldLogStablecoinEvent,
    shouldLogStakingEvent,
    trackEvent,
    createEventBuilder,
    isFiat,
    receiptToken?.experience?.type,
  ]);

  const handleQuickAmountPressWithTracking = useCallback(
    ({ value }: { value: number }) => {
      lastQuickAmountButtonPressed.current =
        value === 1 ? 'MAX' : `${value * 100}%`;

      // call the original handler first
      handleQuickAmountPress({ value });

      // track events based on flow type
      if (shouldLogStablecoinEvent()) {
        const isMax = Boolean(lastQuickAmountButtonPressed.current === 'MAX');
        trackEvent(
          createEventBuilder(MetaMetricsEvents.EARN_INPUT_VALUE_CHANGED)
            .addProperties({
              action_type: 'withdrawal',
              input_value: isMax ? 'MAX' : `${value * 100}%`,
              is_max: isMax,
              token: receiptToken?.symbol,
              network: network?.name,
              user_token_balance: receiptToken?.balanceFormatted,
              experience: receiptToken?.experience?.type,
            })
            .build(),
        );
      } else if (shouldLogStakingEvent()) {
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.UNSTAKE_INPUT_QUICK_AMOUNT_CLICKED,
          )
            .addProperties({
              location: EVENT_LOCATIONS.UNSTAKE_INPUT_VIEW,
              amount: value,
              is_max: value === 1,
              mode: isFiat ? 'fiat' : 'native',
              experience: EARN_EXPERIENCES.POOLED_STAKING,
              user_token_balance: receiptToken?.balanceFormatted,
              token: receiptToken?.symbol,
              network: network?.name,
            })
            .build(),
        );
      }
    },
    [
      handleQuickAmountPress,
      shouldLogStablecoinEvent,
      shouldLogStakingEvent,
      trackEvent,
      createEventBuilder,
      receiptToken?.symbol,
      receiptToken?.balanceFormatted,
      receiptToken?.experience?.type,
      network?.name,
      isFiat,
    ],
  );

  return (
    <ScreenLayout style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        <InputDisplay
          isOverMaximum={isOverMaximum}
          balanceText={stakedBalanceText}
          balanceValue={earnBalanceValue}
          amountToken={amountToken}
          amountFiatNumber={amountFiatNumber}
          isFiat={isFiat}
          asset={token}
          currentCurrency={currentCurrency}
          handleCurrencySwitch={handleCurrencySwitchWithTracking}
          currencyToggleValue={currencyToggleValue}
          maxWithdrawalAmount={maxRiskAwareWithdrawalText}
          error={
            isWithdrawingMoreThanAvailableForLendingToken
              ? strings('earn.amount_exceeds_safe_withdrawal_limit')
              : undefined
          }
        />
        {isStablecoinLendingEnabled && (
          <View style={styles.earnTokenSelectorContainer}>
            <View style={styles.spacer} />
            <EarnTokenSelector
              token={receiptToken as TokenI}
              action={EARN_INPUT_VIEW_ACTIONS.WITHDRAW}
            />
          </View>
        )}
      </ScrollView>
      <QuickAmounts
        amounts={percentageOptions}
        onAmountPress={handleQuickAmountPressWithTracking}
      />
      <Keypad
        value={isFiat ? amountFiatNumber : amountToken}
        onChange={handleKeypadChange}
        style={styles.keypad}
        // TODO: this should be the underlying token symbol/ticker if not ETH
        // once this data is available in the state we can use that
        currency={token.isETH ? 'ETH' : token.ticker ?? token.symbol}
        decimals={isFiat ? 2 : 5}
      />
      <View style={styles.reviewButtonContainer}>
        <Button
          testID="review-button"
          label={buttonLabel}
          size={ButtonSize.Lg}
          labelTextVariant={TextVariant.BodyMDMedium}
          variant={ButtonVariants.Primary}
          loading={isSubmittingStakeWithdrawalTransaction}
          isDisabled={
            isWithdrawingMoreThanAvailableForLendingToken ||
            isOverMaximum.isOverMaximumToken ||
            isOverMaximum.isOverMaximumEth ||
            !isNonZeroAmount ||
            isSubmittingStakeWithdrawalTransaction
          }
          width={ButtonWidthTypes.Full}
          onPress={handleWithdrawPress}
        />
      </View>
    </ScreenLayout>
  );
};

export default EarnWithdrawInputView;
