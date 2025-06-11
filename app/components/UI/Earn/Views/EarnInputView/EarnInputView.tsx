import { Hex } from '@metamask/utils';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { formatEther } from 'ethers/lib/utils';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import ScreenLayout from '../../../Ramp/Aggregator/components/ScreenLayout';
import EstimatedAnnualRewardsCard from '../../../Stake/components/EstimatedAnnualRewardsCard';
import QuickAmounts from '../../../Stake/components/QuickAmounts';
import {
  EVENT_LOCATIONS,
  EVENT_PROVIDERS,
} from '../../../Stake/constants/events';
import usePoolStakedDeposit from '../../../Stake/hooks/usePoolStakedDeposit';
import { withMetaMetrics } from '../../../Stake/utils/metaMetrics/withMetaMetrics';
import EarnTokenSelector from '../../components/EarnTokenSelector';
import InputDisplay from '../../components/InputDisplay';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import useEarnInputHandlers from '../../hooks/useEarnInput';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import styleSheet from './EarnInputView.styles';
import {
  EARN_INPUT_VIEW_ACTIONS,
  EarnInputViewProps,
} from './EarnInputView.types';
import { CHAIN_ID_TO_AAVE_POOL_CONTRACT } from '@metamask/stake-sdk';
import BigNumber from 'bignumber.js';
import Engine from '../../../../../core/Engine';
import { getDecimalChainId } from '../../../../../util/networks';
import useEarnTokens from '../../hooks/useEarnTokens';
import {
  EARN_LENDING_ACTIONS,
  EarnTokenDetails,
} from '../../types/lending.types';

const EarnInputView = () => {
  // navigation hooks
  const navigation = useNavigation();
  const route = useRoute<EarnInputViewProps['route']>();
  const { token } = route.params;

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
  const { attemptDepositTransaction } = usePoolStakedDeposit();
  const { getEarnToken } = useEarnTokens();
  const earnToken = getEarnToken(token);
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

  const navigateToLearnMoreModal = () => {
    navigation.navigate('StakeModals', {
      screen: Routes.STAKING.MODALS.LEARN_MORE,
      params: { chainId: earnToken?.chainId },
    });
  };

  const handleLendingFlow = useCallback(async () => {
    if (
      !activeAccount?.address ||
      !earnToken?.experience?.market?.underlying?.address ||
      !earnToken?.experience?.market?.protocol
    )
      return;

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

    const needsAllowanceIncrease = new BigNumber(
      allowanceMinimalTokenUnit ?? '',
    ).isLessThan(amountTokenMinimalUnitString);

    const lendingPoolContractAddress =
      CHAIN_ID_TO_AAVE_POOL_CONTRACT[getDecimalChainId(earnToken.chainId)] ??
      '';

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
        lendingProtocol: earnToken?.experience?.market?.protocol,
        lendingContractAddress: lendingPoolContractAddress,
        action: needsAllowanceIncrease
          ? EARN_LENDING_ACTIONS.ALLOWANCE_INCREASE
          : EARN_LENDING_ACTIONS.DEPOSIT,
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
    earnToken?.experience,
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
    };

    if (isStakingDepositRedesignedEnabled) {
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
        chainId: earnToken?.chainId,
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
        location: EVENT_LOCATIONS.STAKE_INPUT_VIEW,
      },
    },
  };
  const earnNavBarOptions = {
    hasCancelButton: false,
    hasBackButton: true,
    hasIconButton: true,
    // TODO: https://consensyssoftware.atlassian.net/browse/STAKE-967
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
    // TODO: https://consensyssoftware.atlassian.net/browse/STAKE-967
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

  const title = useMemo(() => {
    if (isStablecoinLendingEnabled) {
      return strings('earn.deposit');
    }
    return strings('stake.stake');
  }, [isStablecoinLendingEnabled]);

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
        asset={token}
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
          <EarnTokenSelector
            token={token}
            action={EARN_INPUT_VIEW_ACTIONS.DEPOSIT}
          />
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
            isLoading={isLoadingEarnMetadata}
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
