import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
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
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import Keypad from '../../../../Base/Keypad';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakingNavbar } from '../../../Navbar';
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import InputDisplay from '../../components/InputDisplay';
import QuickAmounts from '../../../Stake/components/QuickAmounts';
import {
  EVENT_LOCATIONS,
  EVENT_PROVIDERS,
} from '../../../Stake/constants/events';
import usePoolStakedUnstake from '../../../Stake/hooks/usePoolStakedUnstake';
import useEarnWithdrawInput from '../../../Earn/hooks/useEarnWithdrawInput';
import { StakeNavigationParamsList } from '../../../Stake/types';
import { withMetaMetrics } from '../../../Stake/utils/metaMetrics/withMetaMetrics';
import styleSheet from './EarnWithdrawInputView.styles';
import { EarnWithdrawInputViewProps } from './EarnWithdrawInputView.types';
import {
  EarnTokenDetails,
  useEarnTokenDetails,
} from '../../hooks/useEarnTokenDetails';
import { RootState } from '../../../../../reducers';
import { selectConversionRate } from '../../../../../selectors/currencyRateController';
import { Hex } from '@metamask/utils';
import { selectContractExchangeRatesByChainId } from '../../../../../selectors/tokenRatesController';
import { StackNavigationProp } from '@react-navigation/stack';
import { selectConfirmationRedesignFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import {
  isSupportedLendingReceiptTokenByChainId,
  isSupportedLendingTokenByChainId,
} from '../../utils';
import EarnTokenSelector from '../../components/EarnTokenSelector';
import { EARN_INPUT_VIEW_ACTIONS } from '../EarnInputView/EarnInputView.types';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import {
  CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS,
  getAaveV3MaxSafeWithdrawal,
  getLendingPoolLiquidity,
} from '../../utils/tempLending';
import useLendingTokenPair from '../../hooks/useLendingTokenPair';
import BigNumber from 'bignumber.js';

const EarnWithdrawInputView = () => {
  const route = useRoute<EarnWithdrawInputViewProps['route']>();
  const { token } = route.params;
  const { getTokenWithBalanceAndApr } = useEarnTokenDetails();
  const earnToken = getTokenWithBalanceAndApr(token);
  const title =
    isSupportedLendingTokenByChainId(token.symbol, token?.chainId as string) ||
    isSupportedLendingReceiptTokenByChainId(
      token.symbol,
      token?.chainId as string,
    )
      ? strings('earn.withdraw')
      : strings('stake.unstake_eth');
  const navigation =
    useNavigation<StackNavigationProp<StakeNavigationParamsList>>();
  const { styles, theme } = useStyles(styleSheet, {});
  const { attemptUnstakeTransaction } = usePoolStakedUnstake();
  const { lendingToken, receiptToken } = useLendingTokenPair(token);
  console.log({ lendingToken, receiptToken });
  const activeAccount = useSelector(selectSelectedInternalAccount);
  const confirmationRedesignFlags = useSelector(
    selectConfirmationRedesignFlags,
  );

  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  const conversionRate = useSelector(selectConversionRate) ?? 1;
  const contractExchangeRates = useSelector((state: RootState) =>
    selectContractExchangeRatesByChainId(state, token.chainId as Hex),
  );
  const exchangeRate = contractExchangeRates?.[token.address as Hex]?.price;

  const { trackEvent, createEventBuilder } = useMetrics();

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
    earnToken,
    conversionRate,
    exchangeRate,
  });

  const stakedBalanceText = strings('stake.staked_balance');

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

  const buttonLabel = getButtonLabel();

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
    // TODO: STAKE-903
    hasIconButton: !isStablecoinLendingEnabled,
    // TODO: STAKE-903
    // handleIconPress: ???,
  };
  const earnNavBarEventOptions = {
    backButtonEvent: {
      event: MetaMetricsEvents.UNSTAKE_CANCEL_CLICKED,
      properties: {
        selected_provider: EVENT_PROVIDERS.CONSENSYS,
        location: EVENT_LOCATIONS.UNSTAKE_INPUT_VIEW,
      },
    },
    // TODO: STAKE-903
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
        title,
        navigation,
        theme.colors,
        navBarOptions,
        navBarEventOptions,
      ),
    );
  }, [navigation, theme.colors, title, navBarOptions, navBarEventOptions]);

  const [
    isSubmittingStakeWithdrawalTransaction,
    setIsSubmittingStakeWithdrawalTransaction,
  ] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setIsSubmittingStakeWithdrawalTransaction(false);
    }, []),
  );

  // TODO: Display error if amount entered is greater than min(receiptTokenAmount, maxAaveWithdrawal)
  const handleLendingWithdrawalFlow = useCallback(async () => {
    setIsSubmittingStakeWithdrawalTransaction(true);

    // TODO: Get the actual receiptToken protocol.
    // Some of our safety checks only apply to AAVE
    const RECEIPT_TOKEN_PROTOCOL = 'AAVE v3';

    // We likely want to inform the user if this data is missing and the withdrawal fails.
    if (
      !activeAccount?.address ||
      !lendingToken?.address ||
      !receiptToken?.address ||
      !receiptToken?.chainId
    )
      return;

    const amountToWithdraw = amountTokenMinimalUnit.toString();

    try {
      // 1. Make sure pool has available liquidity for withdrawal amount.
      const currentPoolLiquidityInLowestDenomination =
        await getLendingPoolLiquidity(
          lendingToken.address,
          receiptToken.address,
          receiptToken.chainId,
        );

      const amountToWithdrawBn = new BigNumber(amountToWithdraw);

      const poolHasLiquidity = amountToWithdrawBn.lt(
        currentPoolLiquidityInLowestDenomination,
      );

      if (!poolHasLiquidity) {
        // eslint-disable-next-line no-alert
        alert('Withdrawal failed: Pool does not have enough liquidity');
        return;
      }

      if (RECEIPT_TOKEN_PROTOCOL === 'AAVE v3') {
        // 2. (AAVE only) Make sure the user's health factor won't drop below 1 from the transaction and cause a revert (poor UX)
        // Risk-aware withdrawal check if AAVEv3 is selected protocol.
        // Only perform this check if receiptToken protocol is AAVEv3
        const aaveV3MaxSafeWithdrawalLowestDenomination =
          await getAaveV3MaxSafeWithdrawal(
            activeAccount.address,
            lendingToken as EarnTokenDetails,
          );

        const isSafeWithdrawal = amountToWithdrawBn.lt(
          aaveV3MaxSafeWithdrawalLowestDenomination,
        );

        if (!isSafeWithdrawal) {
          // eslint-disable-next-line no-alert
          alert('Withdrawal failed: Unsafe withdrawal could cause liquidation');
          return;
        }
      }

      const lendingPoolContractAddress =
        CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS[receiptToken.chainId] ?? '';

      if (!lendingPoolContractAddress) {
        // eslint-disable-next-line no-alert
        alert(
          'Withdrawal failed: Could not find lending pool contract address',
        );
        return;
      }

      navigation.navigate(Routes.EARN.ROOT, {
        screen: Routes.EARN.LENDING_WITHDRAWAL_CONFIRMATION,
        params: {
          token: receiptToken,
          amountTokenMinimalUnit: amountToWithdraw,
          amountFiat: amountFiatNumber,
          lendingProtocol: RECEIPT_TOKEN_PROTOCOL,
          lendingContractAddress: lendingPoolContractAddress,
        },
      });
    } catch (e) {
      setIsSubmittingStakeWithdrawalTransaction(false);
    }
  }, [
    activeAccount?.address,
    amountFiatNumber,
    amountTokenMinimalUnit,
    lendingToken,
    navigation,
    receiptToken,
  ]);

  const handleUnstakeWithdrawalFlow = useCallback(async () => {
    const isStakingDepositRedesignedEnabled =
      confirmationRedesignFlags?.staking_confirmations;

    const unstakeButtonClickEventProperties = {
      selected_provider: EVENT_PROVIDERS.CONSENSYS,
      tokens_to_stake_native_value: amountToken,
      tokens_to_stake_usd_value: amountFiatNumber,
    };

    if (isStakingDepositRedesignedEnabled) {
      // this prevents the user from adding the transaction withdrawal into the
      // controller state multiple times
      setIsSubmittingStakeWithdrawalTransaction(true);

      // Here we add the transaction to the transaction controller. The
      // redesigned confirmations architecture relies on the transaction
      // metadata object being defined by the time the confirmation is displayed
      // to the user.
      await attemptUnstakeTransaction(
        amountTokenMinimalUnit.toString(),
        activeAccount?.address as string,
      );

      navigation.navigate('StakeScreens', {
        screen: Routes.STANDALONE_CONFIRMATIONS.STAKE_WITHDRAWAL,
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
    activeAccount?.address,
    amountFiatNumber,
    amountToken,
    amountTokenMinimalUnit,
    attemptUnstakeTransaction,
    confirmationRedesignFlags?.staking_confirmations,
    createEventBuilder,
    navigation,
    trackEvent,
  ]);

  const handleWithdrawPress = useCallback(async () => {
    if (earnToken?.experience === EARN_EXPERIENCES.STABLECOIN_LENDING) {
      return handleLendingWithdrawalFlow();
    }

    if (earnToken?.experience === EARN_EXPERIENCES.POOLED_STAKING) {
      return handleUnstakeWithdrawalFlow();
    }
  }, [
    earnToken?.experience,
    handleLendingWithdrawalFlow,
    handleUnstakeWithdrawalFlow,
  ]);

  return (
    <ScreenLayout style={styles.container}>
      <InputDisplay
        isOverMaximum={isOverMaximum}
        balanceText={stakedBalanceText}
        balanceValue={earnBalanceValue}
        isNonZeroAmount={isNonZeroAmount}
        amountToken={amountToken}
        amountFiatNumber={amountFiatNumber}
        isFiat={isFiat}
        ticker={earnToken.ticker ?? earnToken.symbol}
        currentCurrency={currentCurrency}
        handleCurrencySwitch={withMetaMetrics(handleCurrencySwitch, {
          event: MetaMetricsEvents.UNSTAKE_INPUT_CURRENCY_SWITCH_CLICKED,
          properties: {
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            text: 'Currency Switch Trigger',
            location: EVENT_LOCATIONS.UNSTAKE_INPUT_VIEW,
            // We want to track the currency switching to. Not the current currency.
            currency_type: isFiat ? 'native' : 'fiat',
          },
        })}
        currencyToggleValue={currencyToggleValue}
      />
      {isStablecoinLendingEnabled && (
        <View style={styles.earnTokenSelectorContainer}>
          <EarnTokenSelector
            token={token}
            action={EARN_INPUT_VIEW_ACTIONS.WITHDRAW}
          />
        </View>
      )}
      <QuickAmounts
        amounts={percentageOptions}
        onAmountPress={({ value }: { value: number }) =>
          withMetaMetrics(handleQuickAmountPress, {
            event: MetaMetricsEvents.UNSTAKE_INPUT_QUICK_AMOUNT_CLICKED,
            properties: {
              location: EVENT_LOCATIONS.UNSTAKE_INPUT_VIEW,
              amount: value,
              is_max: value === 1,
              mode: isFiat ? 'fiat' : 'native',
            },
          })({ value })
        }
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
          label={buttonLabel}
          size={ButtonSize.Lg}
          labelTextVariant={TextVariant.BodyMDMedium}
          variant={ButtonVariants.Primary}
          loading={isSubmittingStakeWithdrawalTransaction}
          isDisabled={
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
