import { Hex } from '@metamask/utils';
import { useNavigation, useRoute } from '@react-navigation/native';
import { formatEther } from 'ethers/lib/utils';
import React, { useCallback, useEffect } from 'react';
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
import { selectConfirmationRedesignFlags } from '../../../../../selectors/featureFlagController';
import { selectContractExchangeRatesByChainId } from '../../../../../selectors/tokenRatesController';
import Keypad from '../../../../Base/Keypad';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakingNavbar } from '../../../Navbar';
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import EarnTokenSelector from '../../components/EarnTokenSelector';
import EstimatedAnnualRewardsCard from '../../components/EstimatedAnnualRewardsCard';
import InputDisplay from '../../components/InputDisplay';
import QuickAmounts from '../../components/QuickAmounts';
import { isStablecoinLendingFeatureEnabled } from '../../constants';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';
import usePoolStakedDeposit from '../../hooks/usePoolStakedDeposit';
import useStakingInputHandlers from '../../hooks/useStakingInput';
import { withMetaMetrics } from '../../utils/metaMetrics/withMetaMetrics';
import styleSheet from './EarnInputView.styles';
import { EarnInputViewProps } from './EarnInputView.types';
import { getEarnInputViewTitle } from './utils';
import { useEarnTokenDetails } from '../../hooks/useEarnTokenDetails';

const EarnInputView = () => {
  const navigation = useNavigation();
  const route = useRoute<EarnInputViewProps['route']>();
  const { getTokenWithBalanceAndApr } = useEarnTokenDetails();
  const { action, token } = route.params;
  const { styles, theme } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();
  const { attemptDepositTransaction } = usePoolStakedDeposit();
  const earnToken = getTokenWithBalanceAndApr(token);
  const confirmationRedesignFlags = useSelector(
    selectConfirmationRedesignFlags,
  );
  const isStakingDepositRedesignedEnabled =
    confirmationRedesignFlags?.staking_transactions;
  const activeAccount = useSelector(selectSelectedInternalAccount);

  const conversionRate = useSelector(selectConversionRate) ?? 1;
  const contractExchangeRates = useSelector((state: RootState) =>
    selectContractExchangeRatesByChainId(state, token.chainId as Hex),
  );
  const exchangeRate = contractExchangeRates?.[token.address as Hex]?.price;

  console.log('conversionRate', conversionRate);
  const {
    isFiat,
    currentCurrency,
    isNonZeroAmount,
    amountToken,
    amountTokenMinimalUnit,
    fiatAmount,
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
  } = useStakingInputHandlers({
    earnToken,
    conversionRate,
    exchangeRate,
  });

  const navigateToLearnMoreModal = () => {
    navigation.navigate('StakeModals', {
      screen: Routes.STAKING.MODALS.LEARN_MORE,
    });
  };

  const handleStakePress = useCallback(async () => {
    if (isHighGasCostImpact()) {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.STAKE_GAS_COST_IMPACT_WARNING_TRIGGERED,
        )
          .addProperties({
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            location: EVENT_LOCATIONS.STAKE_INPUT_VIEW,
            tokens_to_stake_native_value: amountToken,
            tokens_to_stake_usd_value: fiatAmount,
            estimated_gas_fee: formatEther(estimatedGasFeeWei.toString()),
            estimated_gas_percentage_of_deposit: `${getDepositTxGasPercentage()}%`,
          })
          .build(),
      );

      navigation.navigate('StakeModals', {
        screen: Routes.STAKING.MODALS.GAS_IMPACT,
        params: {
          amountWei: amountTokenMinimalUnit.toString(),
          amountFiat: fiatAmount,
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
      tokens_to_stake_usd_value: fiatAmount,
    };

    if (isStakingDepositRedesignedEnabled) {
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
        amountFiat: fiatAmount,
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
    isHighGasCostImpact,
    navigation,
    amountTokenMinimalUnit,
    fiatAmount,
    annualRewardsToken,
    annualRewardsFiat,
    annualRewardRate,
    trackEvent,
    createEventBuilder,
    amountToken,
    estimatedGasFeeWei,
    getDepositTxGasPercentage,
    isStakingDepositRedesignedEnabled,
    activeAccount,
    attemptDepositTransaction,
  ]);

  const handleMaxButtonPress = () => {
    navigation.navigate('StakeModals', {
      screen: Routes.STAKING.MODALS.MAX_INPUT,
      params: {
        handleMaxPress: handleMax,
      },
    });
  };

  const balanceText = strings('stake.balance');

  const buttonLabel = !isNonZeroAmount
    ? strings('stake.enter_amount')
    : isOverMaximum
    ? strings('stake.not_enough_eth')
    : strings('stake.review');

  useEffect(() => {
    const title = isStablecoinLendingFeatureEnabled()
      ? getEarnInputViewTitle(action, token.symbol, token.isETH)
      : strings('stake.stake_eth');

    navigation.setOptions(
      getStakingNavbar(
        title,
        navigation,
        theme.colors,
        {
          hasBackButton: false,
        },
        {
          cancelButtonEvent: {
            event: MetaMetricsEvents.STAKE_CANCEL_CLICKED,
            properties: {
              selected_provider: EVENT_PROVIDERS.CONSENSYS,
              location: EVENT_LOCATIONS.STAKE_INPUT_VIEW,
            },
          },
        },
      ),
    );
  }, [navigation, action, token, theme.colors]);

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
        amountEth={amountToken}
        fiatAmount={fiatAmount}
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
        {isStablecoinLendingFeatureEnabled() ? (
          <EarnTokenSelector token={route?.params?.token} />
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
        value={!isFiat ? amountToken : fiatAmount}
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
          isDisabled={
            isOverMaximum || !isNonZeroAmount || isLoadingStakingGasFee
          }
          width={ButtonWidthTypes.Full}
          onPress={handleStakePress}
        />
      </View>
    </ScreenLayout>
  );
};

export default EarnInputView;
