import { Hex } from '@metamask/utils';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { formatEther } from 'ethers/lib/utils';
import React, { useCallback, useEffect, useState } from 'react';
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
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { selectConversionRate } from '../../../../../selectors/currencyRateController';
import { selectConfirmationRedesignFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { selectContractExchangeRatesByChainId } from '../../../../../selectors/tokenRatesController';
import Keypad from '../../../../Base/Keypad';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakingNavbar } from '../../../Navbar';
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import EarnTokenSelector from '../../components/EarnTokenSelector';
import EstimatedAnnualRewardsCard from '../../../Stake/components/EstimatedAnnualRewardsCard';
import InputDisplay from '../../components/InputDisplay';
import QuickAmounts from '../../../Stake/components/QuickAmounts';
import {
  EVENT_LOCATIONS,
  EVENT_PROVIDERS,
} from '../../../Stake/constants/events';
import usePoolStakedDeposit from '../../../Stake/hooks/usePoolStakedDeposit';
import { withMetaMetrics } from '../../../Stake/utils/metaMetrics/withMetaMetrics';
import styleSheet from './EarnInputView.styles';
import {
  EARN_INPUT_VIEW_ACTIONS,
  EarnInputViewProps,
} from './EarnInputView.types';
import { getEarnInputViewTitle } from './utils';
import { useEarnTokenDetails } from '../../hooks/useEarnTokenDetails';
import useEarnInputHandlers from '../../hooks/useEarnInput';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import {
  CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS,
  getErc20SpendingLimit,
} from '../../utils/tempLending';
import BigNumber from 'bignumber.js';

const EarnInputView = () => {
  // navigation hooks
  const navigation = useNavigation();
  const route = useRoute<EarnInputViewProps['route']>();
  const { action, token } = route.params;

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
  const activeAccount = useSelector(selectSelectedInternalAccount);
  const conversionRate = useSelector(selectConversionRate) ?? 1;
  const contractExchangeRates = useSelector((state: RootState) =>
    selectContractExchangeRatesByChainId(state, token.chainId as Hex),
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
  const { getTokenWithBalanceAndApr } = useEarnTokenDetails();
  const { attemptDepositTransaction } = usePoolStakedDeposit();
  const earnToken = getTokenWithBalanceAndApr(token);
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
    isLoadingVaultMetadata,
    handleMax,
    balanceValue,
    isHighGasCostImpact,
    getDepositTxGasPercentage,
    estimatedGasFeeWei,
    isLoadingStakingGasFee,
  } = useEarnInputHandlers({
    earnToken,
    conversionRate,
    exchangeRate,
  });

  const navigateToLearnMoreModal = () => {
    navigation.navigate('StakeModals', {
      screen: Routes.STAKING.MODALS.LEARN_MORE,
    });
  };

  const handleLendingFlow = useCallback(async () => {
    if (!activeAccount?.address) return;

    // TODO: Add GasCostImpact for lending deposit flow.
    const amountTokenMinimalUnitString = amountTokenMinimalUnit.toString();

    const tokenContractAddress = earnToken?.address;

    if (!tokenContractAddress || !earnToken?.chainId) return;

    const allowanceMinimalTokenUnit = await getErc20SpendingLimit(
      activeAccount.address,
      tokenContractAddress,
      earnToken.chainId,
    );

    const needsAllowanceIncrease = new BigNumber(
      allowanceMinimalTokenUnit ?? '',
    ).isLessThan(amountTokenMinimalUnitString);

    const lendingPoolContractAddress =
      CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS[earnToken.chainId] ?? '';

    navigation.navigate(Routes.EARN.ROOT, {
      screen: Routes.EARN.LENDING_DEPOSIT_CONFIRMATION,
      params: {
        token,
        amountTokenMinimalUnit: amountTokenMinimalUnit.toString(),
        amountFiat: amountFiatNumber,
        // TODO: These values are inaccurate since useEarnInputHandlers doesn't support stablecoin lending yet.
        // Make sure these values are accurate after updating useEarnInputHandlers to support stablecoin lending.
        annualRewardsToken,
        annualRewardsFiat,
        annualRewardRate,
        // TODO: Replace hardcoded protocol in future iteration.
        lendingProtocol: 'AAVE v3',
        lendingContractAddress: lendingPoolContractAddress,
        action: needsAllowanceIncrease
          ? EARN_INPUT_VIEW_ACTIONS.ALLOWANCE_INCREASE
          : EARN_INPUT_VIEW_ACTIONS.LEND,
      },
    });
  }, [
    activeAccount?.address,
    amountFiatNumber,
    amountTokenMinimalUnit,
    annualRewardRate,
    annualRewardsFiat,
    annualRewardsToken,
    earnToken?.address,
    earnToken?.chainId,
    navigation,
    token,
  ]);

  const handlePooledStakingFlow = useCallback(async () => {
    if (isHighGasCostImpact()) {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.STAKE_GAS_COST_IMPACT_WARNING_TRIGGERED,
        )
          .addProperties({
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            location: EVENT_LOCATIONS.STAKE_INPUT_VIEW,
            tokens_to_stake_native_value: amountToken,
            tokens_to_stake_usd_value: amountFiatNumber,
            estimated_gas_fee: formatEther(estimatedGasFeeWei.toString()),
            estimated_gas_percentage_of_deposit: `${getDepositTxGasPercentage()}%`,
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
        },
      });
      return;
    }

    const amountWeiString = amountTokenMinimalUnit.toString();

    const stakeButtonClickEventProperties = {
      selected_provider: EVENT_PROVIDERS.CONSENSYS,
      tokens_to_stake_native_value: amountToken,
      tokens_to_stake_usd_value: amountFiatNumber,
    };

    if (isStakingDepositRedesignedEnabled) {
      // this prevents the user from adding the transaction deposit into the
      // controller state multiple times
      setIsSubmittingStakeDepositTransaction(true);

      // Here we add the transaction to the transaction controller. The
      // redesigned confirmations architecture relies on the transaction
      // metadata object being defined by the time the confirmation is displayed
      // to the user.
      await attemptDepositTransaction(
        amountWeiString,
        activeAccount?.address as string,
        undefined,
        true,
      );
      navigation.navigate('StakeScreens', {
        screen: Routes.STANDALONE_CONFIRMATIONS.STAKE_DEPOSIT,
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
      },
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.REVIEW_STAKE_BUTTON_CLICKED)
        .addProperties(stakeButtonClickEventProperties)
        .build(),
    );
  }, [
    activeAccount?.address,
    amountFiatNumber,
    amountToken,
    amountTokenMinimalUnit,
    annualRewardRate,
    annualRewardsFiat,
    annualRewardsToken,
    attemptDepositTransaction,
    createEventBuilder,
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
      earnToken?.experience === EARN_EXPERIENCES.STABLECOIN_LENDING &&
      isStablecoinLendingEnabled
    ) {
      await handleLendingFlow();
      return;
    }

    // Pooled-Staking Flow
    await handlePooledStakingFlow();
  }, [
    earnToken?.experience,
    isStablecoinLendingEnabled,
    handlePooledStakingFlow,
    handleLendingFlow,
  ]);

  const handleMaxButtonPress = () => {
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
  };

  const getButtonLabel = () => {
    if (!isNonZeroAmount) {
      return strings('stake.enter_amount');
    }
    if (isOverMaximum.isOverMaximumToken) {
      return strings('stake.not_enough_token', {
        ticker: earnToken.ticker ?? earnToken.symbol,
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
        location: EVENT_LOCATIONS.STAKE_INPUT_VIEW,
      },
    },
  };
  const earnNavBarOptions = {
    hasCancelButton: false,
    hasBackButton: true,
    hasIconButton: true,
    // TODO: STAKE-967
    // handleIconPress: navigateToLearnMoreModal,
  };
  const earnNavBarEventOptions = {
    backButtonEvent: {
      event: MetaMetricsEvents.STAKE_CANCEL_CLICKED,
      properties: {
        selected_provider: EVENT_PROVIDERS.CONSENSYS,
        location: EVENT_LOCATIONS.STAKE_INPUT_VIEW,
      },
    },
    // TODO: STAKE-967
    // iconButtonEvent: {
    //   event: MetaMetricsEvents.TOOLTIP_OPENED,
    //   properties: {
    //     selected_provider: EVENT_PROVIDERS.CONSENSYS,
    //     text: 'Tooltip Opened',
    //     location: EVENT_LOCATIONS.STAKE_INPUT_VIEW,
    //     tooltip_name: 'MetaMask Earn Estimated Rewards',
    //   },
    // },
  };
  const navBarOptions = isStablecoinLendingEnabled
    ? earnNavBarOptions
    : stakingNavBarOptions;
  const navBarEventOptions = isStablecoinLendingEnabled
    ? earnNavBarEventOptions
    : stakingNavBarEventOptions;
  const title = isStablecoinLendingEnabled
    ? getEarnInputViewTitle(action)
    : strings('stake.stake_eth');

  useEffect(() => {
    navigation.setOptions(
      getStakingNavbar(
        title,
        navigation,
        theme.colors,
        navBarOptions,
        navBarEventOptions,
      ),
    );
  }, [
    navigation,
    action,
    token,
    theme.colors,
    navBarEventOptions,
    navBarOptions,
    title,
  ]);

  useEffect(() => {
    calculateEstimatedAnnualRewards();
  }, [
    amountToken,
    amountTokenMinimalUnit,
    isFiat,
    calculateEstimatedAnnualRewards,
  ]);

  return (
    <ScreenLayout style={styles.container}>
      <InputDisplay
        isOverMaximum={isOverMaximum}
        balanceText={balanceText}
        balanceValue={balanceValue}
        isNonZeroAmount={isNonZeroAmount}
        amountToken={amountToken}
        amountFiatNumber={amountFiatNumber}
        isFiat={isFiat}
        ticker={token.ticker ?? token.symbol}
        currentCurrency={currentCurrency}
        handleCurrencySwitch={withMetaMetrics(handleCurrencySwitch, {
          event: MetaMetricsEvents.STAKE_INPUT_CURRENCY_SWITCH_CLICKED,
          properties: {
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            text: 'Currency Switch Trigger',
            location: EVENT_LOCATIONS.STAKE_INPUT_VIEW,
            currency_type: !isFiat ? 'fiat' : 'native',
          },
        })}
        currencyToggleValue={currencyToggleValue}
      />
      <View style={styles.rewardsRateContainer}>
        {isStablecoinLendingEnabled ? (
          <EarnTokenSelector token={token} />
        ) : (
          <EstimatedAnnualRewardsCard
            estimatedAnnualRewards={estimatedAnnualRewards}
            onIconPress={withMetaMetrics(navigateToLearnMoreModal, {
              event: MetaMetricsEvents.TOOLTIP_OPENED,
              properties: {
                selected_provider: EVENT_PROVIDERS.CONSENSYS,
                text: 'Tooltip Opened',
                location: EVENT_LOCATIONS.STAKE_INPUT_VIEW,
                tooltip_name: 'MetaMask Pool Estimated Rewards',
              },
            })}
            isLoading={isLoadingVaultMetadata}
          />
        )}
      </View>
      <QuickAmounts
        amounts={percentageOptions}
        onAmountPress={({ value }: { value: number }) =>
          withMetaMetrics(handleQuickAmountPress, {
            event: MetaMetricsEvents.STAKE_INPUT_QUICK_AMOUNT_CLICKED,
            properties: {
              location: EVENT_LOCATIONS.STAKE_INPUT_VIEW,
              amount: value,
              is_max: false,
              mode: !isFiat ? 'native' : 'fiat',
            },
          })({ value })
        }
        onMaxPress={withMetaMetrics(handleMaxButtonPress, {
          event: MetaMetricsEvents.STAKE_INPUT_QUICK_AMOUNT_CLICKED,
          properties: {
            location: EVENT_LOCATIONS.STAKE_INPUT_VIEW,
            is_max: true,
            mode: !isFiat ? 'native' : 'fiat',
          },
        })}
      />
      <Keypad
        value={!isFiat ? amountToken : amountFiatNumber}
        onChange={handleKeypadChange}
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
            isLoadingStakingGasFee ||
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
