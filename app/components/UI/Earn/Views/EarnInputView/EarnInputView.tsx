import { ORIGIN_METAMASK, toHex } from '@metamask/controller-utils';
import { CHAIN_ID_TO_AAVE_POOL_CONTRACT } from '@metamask/stake-sdk';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import { formatEther } from 'ethers/lib/utils';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import Engine from '../../../../../core/Engine';
import { RootState } from '../../../../../reducers';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { selectConversionRate } from '../../../../../selectors/currencyRateController';
import { selectConfirmationRedesignFlags } from '../../../../../selectors/featureFlagController/confirmations';
import {
  selectNetworkConfigurationByChainId,
  selectNetworkClientId,
} from '../../../../../selectors/networkController';
import { selectContractExchangeRatesByChainId } from '../../../../../selectors/tokenRatesController';
import { getDecimalChainId } from '../../../../../util/networks';
import { addTransactionBatch } from '../../../../../util/transaction-controller';
import Keypad from '../../../../Base/Keypad';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakingNavbar } from '../../../Navbar';
import ScreenLayout from '../../../Ramp/Aggregator/components/ScreenLayout';
import EstimatedAnnualRewardsCard from '../../../Stake/components/EstimatedAnnualRewardsCard';
import QuickAmounts from '../../../Stake/components/QuickAmounts';
import { EVENT_PROVIDERS } from '../../../Stake/constants/events';
import { EVENT_LOCATIONS } from '../../constants/events';
import usePoolStakedDeposit from '../../../Stake/hooks/usePoolStakedDeposit';
import { withMetaMetrics } from '../../../Stake/utils/metaMetrics/withMetaMetrics';
import EarnTokenSelector from '../../components/EarnTokenSelector';
import InputDisplay from '../../components/InputDisplay';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import useEarnInputHandlers from '../../hooks/useEarnInput';
import useEarnTokens from '../../hooks/useEarnTokens';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import {
  EARN_LENDING_ACTIONS,
  EarnTokenDetails,
} from '../../types/lending.types';
import {
  generateLendingAllowanceIncreaseTransaction,
  generateLendingDepositTransaction,
} from '../../utils/tempLending';
import styleSheet from './EarnInputView.styles';
import { EARN_INPUT_VIEW_ACTIONS } from './EarnInputView.types';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { getIsRedesignedStablecoinLendingScreenEnabled } from './utils';
import { useEarnAnalyticsEventLogging } from '../../hooks/useEarnEventAnalyticsLogging';
import { doesTokenRequireAllowanceReset } from '../../utils';
import { ScrollView } from 'react-native-gesture-handler';
import { trace, TraceName } from '../../../../../util/trace';
import { useEndTraceOnMount } from '../../../../hooks/useEndTraceOnMount';
import { EVM_SCOPE } from '../../constants/networks';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../../../util/navigation/types';

type EarnInputViewProps = StackScreenProps<RootParamList, 'Stake'>;

const EarnInputView = ({ route }: EarnInputViewProps) => {
  // navigation hooks
  const navigation = useNavigation();
  const { token } = route.params;

  // We want to keep track of the last quick amount pressed before navigating to review.
  const lastQuickAmountButtonPressed = useRef<string | null>(null);

  // state
  const [
    isSubmittingStakeDepositTransaction,
    setIsSubmittingStakeDepositTransaction,
  ] = useState(false);

  const confirmationRedesignFlags = useSelector(
    selectConfirmationRedesignFlags,
  );

  const isStakingDepositRedesignedEnabled =
    confirmationRedesignFlags?.staking_confirmations;
  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );
  const conversionRate = useSelector(selectConversionRate) ?? 1;
  const contractExchangeRates = useSelector((state: RootState) =>
    selectContractExchangeRatesByChainId(state, token?.chainId as Hex),
  );
  const network = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, token?.chainId as Hex),
  );
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  // if token is ETH, use 1 as the exchange rate
  // otherwise, use the contract exchange rate or 0 if undefined
  const exchangeRate = token.isETH
    ? 1
    : contractExchangeRates?.[token.address as Hex]?.price ?? 0;

  // other hooks
  const { styles, theme } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();
  const { attemptDepositTransaction } = usePoolStakedDeposit();
  const { getEarnToken } = useEarnTokens();
  const earnToken = getEarnToken(token);
  const networkClientId = useSelector(selectNetworkClientId);
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
    calculateEstimatedAnnualRewards,
    estimatedAnnualRewards,
    annualRewardsToken,
    annualRewardsFiat,
    annualRewardRate,
    isLoadingEarnMetadata,
    handleMax,
    balanceValue,
    isHighGasCostImpact,
    getDepositTxGasPercentage,
    estimatedGasFeeWei,
    isLoadingEarnGasFee,
  } = useEarnInputHandlers({
    earnToken: earnToken as EarnTokenDetails,
    conversionRate,
    exchangeRate,
  });

  const { shouldLogStablecoinEvent, shouldLogStakingEvent } =
    useEarnAnalyticsEventLogging({
      earnToken,
      isStablecoinLendingEnabled,
      token,
      actionType: 'deposit',
    });

  useEffect(() => {
    if (shouldLogStablecoinEvent()) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.EARN_INPUT_OPENED)
          .addProperties({
            action_type: 'deposit',
            token: earnToken?.symbol,
            network: network?.name,
            user_token_balance: balanceValue,
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
          })
          .build(),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEndTraceOnMount(TraceName.EarnDepositScreen);

  const navigateToLearnMoreModal = () => {
    const tokenExperience = earnToken?.experience?.type;

    if (tokenExperience === EARN_EXPERIENCES.POOLED_STAKING) {
      trace({ name: TraceName.EarnFaq, data: { experience: tokenExperience } });
      navigation.navigate('StakeModals', {
        screen: Routes.STAKING.MODALS.LEARN_MORE,
        params: { chainId: earnToken?.chainId },
      });
    }

    if (tokenExperience === EARN_EXPERIENCES.STABLECOIN_LENDING) {
      trace({ name: TraceName.EarnFaq, data: { experience: tokenExperience } });
      navigation.navigate(Routes.EARN.MODALS.ROOT, {
        screen: Routes.EARN.MODALS.LENDING_LEARN_MORE,
        // TODO: Why is earnToken possibly undefined?
        params: { asset: earnToken! },
      });
    }
  };

  const handleQuickAmountPressWithTracking = useCallback(
    ({ value }: { value: number }) => {
      lastQuickAmountButtonPressed.current = `${value * 100}%`;

      // call the original handler first
      handleQuickAmountPress({ value });

      // track events based on flow type
      if (shouldLogStablecoinEvent()) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.EARN_INPUT_VALUE_CHANGED)
            .addProperties({
              action_type: 'deposit',
              input_value: `${value * 100}%`,
              token: earnToken?.symbol,
              network: network?.name,
              user_token_balance: balanceValue,
              experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
            })
            .build(),
        );
      } else if (shouldLogStakingEvent()) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.STAKE_INPUT_QUICK_AMOUNT_CLICKED)
            .addProperties({
              location: EVENT_LOCATIONS.EARN_INPUT_VIEW,
              amount: value,
              is_max: false,
              mode: !isFiat ? 'native' : 'fiat',
              experience: EARN_EXPERIENCES.POOLED_STAKING,
            })
            .build(),
        );
      }
    },
    [
      shouldLogStablecoinEvent,
      shouldLogStakingEvent,
      handleQuickAmountPress,
      trackEvent,
      createEventBuilder,
      earnToken?.symbol,
      network?.name,
      balanceValue,
      isFiat,
    ],
  );

  const handleLendingFlow = useCallback(async () => {
    if (
      !selectedAccount?.address ||
      !earnToken?.experience?.market?.underlying?.address ||
      !earnToken?.experience?.market?.protocol
    )
      return;

    if (shouldLogStablecoinEvent()) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.EARN_REVIEW_BUTTON_CLICKED)
          .addProperties({
            action_type: 'deposit',
            token: earnToken?.symbol,
            network: network?.name,
            user_token_balance: balanceValue,
            transaction_value: `${amountToken} ${earnToken?.symbol}`,
            lastQuickAmountButtonPressed: lastQuickAmountButtonPressed.current,
            location: EVENT_LOCATIONS.EARN_INPUT_VIEW,
            is_max: Boolean(lastQuickAmountButtonPressed.current === 'MAX'),
            mode: !isFiat ? 'native' : 'fiat',
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
          })
          .build(),
      );
    }

    // TODO: Add GasCostImpact for lending deposit flow after launch.
    const amountTokenMinimalUnitString = amountTokenMinimalUnit.toString();

    const tokenContractAddress = earnToken?.address;

    if (!tokenContractAddress || !earnToken?.chainId) return;

    const allowanceMinimalTokenUnitBN =
      await Engine.context.EarnController.getLendingTokenAllowance(
        earnToken.experience.market.protocol,
        earnToken.experience.market.underlying.address,
      );

    const allowanceMinimalTokenUnit = allowanceMinimalTokenUnitBN
      ? allowanceMinimalTokenUnitBN.toString()
      : '0';

    const needsAllowanceIncrease = (() => {
      const isExistingAllowanceLowerThanNeeded = new BigNumber(
        allowanceMinimalTokenUnit ?? '',
      ).isLessThan(amountTokenMinimalUnitString);

      if (
        doesTokenRequireAllowanceReset(earnToken.chainId, earnToken.symbol) &&
        isExistingAllowanceLowerThanNeeded &&
        allowanceMinimalTokenUnit !== '0'
      )
        return true;

      return isExistingAllowanceLowerThanNeeded;
    })();

    if (needsAllowanceIncrease) {
      trace({ name: TraceName.EarnDepositSpendingCapScreen });
    } else {
      trace({ name: TraceName.EarnDepositReviewScreen });
    }

    const lendingPoolContractAddress =
      CHAIN_ID_TO_AAVE_POOL_CONTRACT[getDecimalChainId(earnToken.chainId)] ??
      '';

    const createRedesignedLendingDepositConfirmation = (
      _earnToken: EarnTokenDetails,
      _activeAccount: InternalAccount,
    ) => {
      const approveTxParams = generateLendingAllowanceIncreaseTransaction(
        amountTokenMinimalUnit.toString(),
        _activeAccount.address,
        _earnToken?.address,
        _earnToken.chainId as string,
      );
      if (!approveTxParams) return;

      const approveTx = {
        params: {
          to: approveTxParams.txParams.to
            ? toHex(approveTxParams.txParams.to)
            : undefined,
          from: approveTxParams.txParams.from,
          data: (approveTxParams.txParams.data as Hex) || undefined,
          value: approveTxParams.txParams.value
            ? toHex(approveTxParams.txParams.value)
            : undefined,
        },
        type: TransactionType.tokenMethodApprove,
      };

      const lendingDepositTxParams = generateLendingDepositTransaction(
        amountTokenMinimalUnit.toString(),
        _activeAccount.address,
        _earnToken?.address,
        _earnToken.chainId as string,
      );

      if (!lendingDepositTxParams) return;

      const lendingDepositTx = {
        params: {
          to: lendingDepositTxParams.txParams.to
            ? toHex(lendingDepositTxParams.txParams.to)
            : undefined,
          from: lendingDepositTxParams.txParams.from,
          data: (lendingDepositTxParams.txParams.data as Hex) || undefined,
          value: lendingDepositTxParams.txParams.value
            ? toHex(lendingDepositTxParams.txParams.value)
            : undefined,
        },
        type: TransactionType.lendingDeposit,
      };

      addTransactionBatch({
        from: (selectedAccount?.address as Hex) || '0x',
        networkClientId,
        origin: ORIGIN_METAMASK,
        transactions: [approveTx, lendingDepositTx],
        disable7702: true,
        disableHook: true,
        disableSequential: false,
        requireApproval: true,
      });

      navigation.navigate('StakeScreens', {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      });
    };

    const createLegacyLendingDepositConfirmation = (
      _lendingPoolContractAddress: string,
      _needsAllowanceIncrease: boolean,
    ) => {
      navigation.navigate(Routes.EARN.ROOT, {
        screen: Routes.EARN.LENDING_DEPOSIT_CONFIRMATION,
        params: {
          token,
          amountTokenMinimalUnit: amountTokenMinimalUnit.toString(),
          amountFiat: amountFiatNumber,
          annualRewardsToken,
          annualRewardsFiat,
          annualRewardRate,
          lendingProtocol: earnToken?.experience?.market?.protocol,
          lendingContractAddress: lendingPoolContractAddress,
          action: needsAllowanceIncrease
            ? EARN_LENDING_ACTIONS.ALLOWANCE_INCREASE
            : EARN_LENDING_ACTIONS.DEPOSIT,
          allowanceMinimalTokenUnit,
        },
      });
    };

    const isRedesignedStablecoinLendingScreenEnabled =
      getIsRedesignedStablecoinLendingScreenEnabled();
    if (isRedesignedStablecoinLendingScreenEnabled) {
      createRedesignedLendingDepositConfirmation(earnToken, selectedAccount);
    } else {
      createLegacyLendingDepositConfirmation(
        lendingPoolContractAddress,
        needsAllowanceIncrease,
      );
    }
  }, [
    selectedAccount,
    earnToken,
    shouldLogStablecoinEvent,
    trackEvent,
    createEventBuilder,
    network?.name,
    balanceValue,
    amountToken,
    isFiat,
    amountTokenMinimalUnit,
    networkClientId,
    navigation,
    token,
    amountFiatNumber,
    annualRewardsToken,
    annualRewardsFiat,
    annualRewardRate,
  ]);

  const handlePooledStakingFlow = useCallback(async () => {
    if (isHighGasCostImpact()) {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.STAKE_GAS_COST_IMPACT_WARNING_TRIGGERED,
        )
          .addProperties({
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            location: EVENT_LOCATIONS.EARN_INPUT_VIEW,
            tokens_to_stake_native_value: amountToken,
            tokens_to_stake_usd_value: amountFiatNumber,
            estimated_gas_fee: formatEther(estimatedGasFeeWei.toString()),
            estimated_gas_percentage_of_deposit: `${getDepositTxGasPercentage()}%`,
            experience: EARN_EXPERIENCES.POOLED_STAKING,
          })
          .build(),
      );

      navigation.navigate('StakeModals', {
        screen: Routes.STAKING.MODALS.GAS_IMPACT,
        params: {
          amountWei: amountTokenMinimalUnit.toString(),
          amountFiat: amountFiatNumber,
          annualRewardsToken,
          annualRewardsFiat,
          annualRewardRate,
          estimatedGasFee: formatEther(estimatedGasFeeWei.toString()),
          estimatedGasFeePercentage: `${getDepositTxGasPercentage()}%`,
          chainId: earnToken?.chainId,
        },
      });
      return;
    }

    const amountWeiString = amountTokenMinimalUnit.toString();

    const stakeButtonClickEventProperties = {
      selected_provider: EVENT_PROVIDERS.CONSENSYS,
      tokens_to_stake_native_value: amountToken,
      tokens_to_stake_usd_value: amountFiatNumber,
      experience: EARN_EXPERIENCES.POOLED_STAKING,
    };

    if (isStakingDepositRedesignedEnabled) {
      // start trace between user initiating deposit and the redesigned confirmation screen loading
      trace({
        name: TraceName.EarnDepositConfirmationScreen,
        data: { experience: EARN_EXPERIENCES.POOLED_STAKING },
      });

      // this prevents the user from adding the transaction deposit into the
      // controller state multiple times
      setIsSubmittingStakeDepositTransaction(true);

      // Here we add the transaction to the transaction controller. The
      // redesigned confirmations architecture relies on the transaction
      // metadata object being defined by the time the confirmation is displayed
      // to the user.
      if (!attemptDepositTransaction) return;
      await attemptDepositTransaction(
        amountWeiString,
        selectedAccount?.address as string,
        undefined,
        true,
      );

      navigation.navigate('StakeScreens', {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      });

      const withRedesignedPropEventProperties = {
        ...stakeButtonClickEventProperties,
        is_redesigned: true,
      };

      trackEvent(
        createEventBuilder(MetaMetricsEvents.REVIEW_STAKE_BUTTON_CLICKED)
          .addProperties(withRedesignedPropEventProperties)
          .build(),
      );
      return;
    }

    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE_CONFIRMATION,
      params: {
        amountWei: amountWeiString,
        amountFiat: amountFiatNumber,
        annualRewardsToken,
        annualRewardsFiat,
        annualRewardRate,
        chainId: earnToken?.chainId,
      },
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.REVIEW_STAKE_BUTTON_CLICKED)
        .addProperties(stakeButtonClickEventProperties)
        .build(),
    );
  }, [
    selectedAccount?.address,
    amountFiatNumber,
    amountToken,
    amountTokenMinimalUnit,
    annualRewardRate,
    annualRewardsFiat,
    annualRewardsToken,
    attemptDepositTransaction,
    createEventBuilder,
    earnToken?.chainId,
    estimatedGasFeeWei,
    getDepositTxGasPercentage,
    isHighGasCostImpact,
    isStakingDepositRedesignedEnabled,
    navigation,
    trackEvent,
  ]);

  const handleEarnPress = useCallback(async () => {
    // Stablecoin Lending Flow
    if (
      earnToken?.experience?.type === EARN_EXPERIENCES.STABLECOIN_LENDING &&
      isStablecoinLendingEnabled
    ) {
      await handleLendingFlow();
      return;
    }

    // Pooled-Staking Flow
    await handlePooledStakingFlow();
  }, [
    earnToken?.experience?.type,
    isStablecoinLendingEnabled,
    handlePooledStakingFlow,
    handleLendingFlow,
  ]);

  const handleMaxButtonPress = useCallback(() => {
    lastQuickAmountButtonPressed.current = 'MAX';

    if (!isStablecoinLendingEnabled || token.isETH) {
      navigation.navigate('StakeModals', {
        screen: Routes.STAKING.MODALS.MAX_INPUT,
        params: {
          handleMaxPress: handleMax,
        },
      });
    } else {
      handleMax();
    }
  }, [handleMax, isStablecoinLendingEnabled, navigation, token.isETH]);

  const handleMaxPressWithTracking = useCallback(() => {
    // call the original handler first
    handleMaxButtonPress();

    // track events based on flow type
    if (shouldLogStablecoinEvent()) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.EARN_INPUT_VALUE_CHANGED)
          .addProperties({
            action_type: 'deposit',
            input_value: 'Max',
            token: earnToken?.symbol,
            network: network?.name,
            user_token_balance: balanceValue,
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
          })
          .build(),
      );
    } else if (shouldLogStakingEvent()) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.STAKE_INPUT_QUICK_AMOUNT_CLICKED)
          .addProperties({
            location: EVENT_LOCATIONS.EARN_INPUT_VIEW,
            is_max: true,
            mode: !isFiat ? 'native' : 'fiat',
            experience: EARN_EXPERIENCES.POOLED_STAKING,
          })
          .build(),
      );
    }
  }, [
    shouldLogStablecoinEvent,
    shouldLogStakingEvent,
    handleMaxButtonPress,
    trackEvent,
    createEventBuilder,
    earnToken?.symbol,
    network?.name,
    balanceValue,
    isFiat,
  ]);

  const handleCurrencySwitchWithTracking = useCallback(() => {
    // Call the original handler first
    handleCurrencySwitch();

    if (shouldLogStablecoinEvent()) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.EARN_INPUT_CURRENCY_SWITCH_CLICKED)
          .addProperties({
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            text: 'Currency Switch Clicked',
            location: EVENT_LOCATIONS.EARN_INPUT_VIEW,
            currency_type: !isFiat ? 'fiat' : 'native',
            experience: earnToken?.experience?.type,
          })
          .build(),
      );
    }
  }, [
    shouldLogStablecoinEvent,
    handleCurrencySwitch,
    trackEvent,
    createEventBuilder,
    isFiat,
    earnToken?.experience?.type,
  ]);

  const getButtonLabel = () => {
    if (!isNonZeroAmount) {
      return strings('stake.enter_amount');
    }
    if (isOverMaximum.isOverMaximumToken) {
      return strings('stake.not_enough_token', {
        ticker: earnToken?.ticker ?? earnToken?.symbol,
      });
    }
    if (isOverMaximum.isOverMaximumEth) {
      return strings('stake.not_enough_eth');
    }
    return strings('stake.review');
  };

  const balanceText = strings('stake.balance');
  const buttonLabel = getButtonLabel();

  useFocusEffect(
    useCallback(() => {
      setIsSubmittingStakeDepositTransaction(false);
    }, []),
  );

  const stakingNavBarOptions = {
    hasCancelButton: true,
    hasBackButton: false,
  };
  const stakingNavBarEventOptions = {
    cancelButtonEvent: {
      event: MetaMetricsEvents.STAKE_CANCEL_CLICKED,
      properties: {
        selected_provider: EVENT_PROVIDERS.CONSENSYS,
        location: EVENT_LOCATIONS.EARN_INPUT_VIEW,
        experience: EARN_EXPERIENCES.POOLED_STAKING,
        token: token.symbol,
      },
    },
  };
  const earnNavBarOptions = {
    hasCancelButton: false,
    hasBackButton: true,
    hasIconButton: true,
    handleIconPress: navigateToLearnMoreModal,
  };
  const earnNavBarEventOptions = {
    backButtonEvent: {
      event: MetaMetricsEvents.EARN_INPUT_BACK_BUTTON_CLICKED,
      properties: {
        selected_provider: EVENT_PROVIDERS.CONSENSYS,
        location: EVENT_LOCATIONS.EARN_INPUT_VIEW,
        experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
        token: token.symbol,
      },
    },
    iconButtonEvent: {
      event: MetaMetricsEvents.TOOLTIP_OPENED,
      properties: {
        selected_provider: EVENT_PROVIDERS.CONSENSYS,
        text: 'Tooltip Opened',
        location: EVENT_LOCATIONS.EARN_INPUT_VIEW,
        tooltip_name: 'Lending Historic Market APY Graph',
        experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
        token: token.symbol,
        apr: `${earnToken?.experience.apr}%`,
      },
    },
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
        strings('earn.deposit'),
        navigation,
        theme.colors,
        navBarOptions,
        navBarEventOptions,
      ),
    );
  }, [navigation, token, theme.colors, navBarEventOptions, navBarOptions]);

  useEffect(() => {
    calculateEstimatedAnnualRewards();
  }, [
    amountToken,
    amountTokenMinimalUnit,
    isFiat,
    calculateEstimatedAnnualRewards,
  ]);

  // This component rerenders to recalculate gas estimate which causes duplicate events to fire.
  // This ref will allow one insufficient funds error to fire per visit to the page.
  const isSendingInsufficientFundsMetaMetric = useRef(false);

  useEffect(() => {
    const emitInsufficientFundsMetaMetric = () => {
      // track insufficient balance for stablecoin lending deposits
      if (shouldLogStablecoinEvent()) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.EARN_INPUT_INSUFFICIENT_BALANCE)
            .addProperties({
              provider: EVENT_PROVIDERS.CONSENSYS,
              location: EVENT_LOCATIONS.EARN_INPUT_VIEW,
              token_name: token.name,
              token: token.symbol,
              network: network?.name,
              experience: earnToken?.experience.type,
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
    isOverMaximum?.isOverMaximumEth,
    isOverMaximum?.isOverMaximumToken,
    network?.name,
    token.chainId,
    token.name,
    token.symbol,
    trackEvent,
    earnToken?.experience.type,
  ]);

  return (
    <ScreenLayout style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        <InputDisplay
          isOverMaximum={isOverMaximum}
          balanceText={balanceText}
          balanceValue={balanceValue}
          amountToken={amountToken}
          amountFiatNumber={amountFiatNumber}
          isFiat={isFiat}
          asset={token}
          currentCurrency={currentCurrency}
          handleCurrencySwitch={handleCurrencySwitchWithTracking}
          currencyToggleValue={currencyToggleValue}
        />
        <View style={styles.rewardsRateContainer}>
          {isStablecoinLendingEnabled ? (
            <>
              <View style={styles.spacer} />
              <EarnTokenSelector
                token={token}
                action={EARN_INPUT_VIEW_ACTIONS.DEPOSIT}
              />
            </>
          ) : (
            <EstimatedAnnualRewardsCard
              estimatedAnnualRewards={estimatedAnnualRewards}
              onIconPress={withMetaMetrics(navigateToLearnMoreModal, {
                event: MetaMetricsEvents.TOOLTIP_OPENED,
                properties: {
                  selected_provider: EVENT_PROVIDERS.CONSENSYS,
                  text: 'Tooltip Opened',
                  location: EVENT_LOCATIONS.EARN_INPUT_VIEW,
                  tooltip_name: 'MetaMask Pool Estimated Rewards',
                },
              })}
              isLoading={isLoadingEarnMetadata}
            />
          )}
        </View>
      </ScrollView>
      <QuickAmounts
        amounts={percentageOptions}
        onAmountPress={handleQuickAmountPressWithTracking}
        onMaxPress={handleMaxPressWithTracking}
      />
      <Keypad
        value={!isFiat ? amountToken : amountFiatNumber}
        // Debounce used to avoid error message flicker from recalculating gas fee estimate
        onChange={debounce(handleKeypadChange, 1)}
        style={styles.keypad}
        currency={token.symbol}
        decimals={!isFiat ? 5 : 2}
      />
      <View style={styles.reviewButtonContainer}>
        <Button
          label={buttonLabel}
          size={ButtonSize.Lg}
          labelTextVariant={TextVariant.BodyMDMedium}
          variant={ButtonVariants.Primary}
          loading={isSubmittingStakeDepositTransaction}
          isDisabled={
            isOverMaximum.isOverMaximumToken ||
            isOverMaximum.isOverMaximumEth ||
            !isNonZeroAmount ||
            isLoadingEarnGasFee ||
            isSubmittingStakeDepositTransaction
          }
          width={ButtonWidthTypes.Full}
          onPress={handleEarnPress}
        />
      </View>
    </ScreenLayout>
  );
};

export default EarnInputView;
