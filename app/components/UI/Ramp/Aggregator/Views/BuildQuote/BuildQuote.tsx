import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, View, BackHandler, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import BN4 from 'bnjs4';
import {
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';

import { useRampSDK } from '../../sdk';
import usePaymentMethods from '../../hooks/usePaymentMethods';
import useRegions from '../../hooks/useRegions';
import useAnalytics from '../../../hooks/useAnalytics';
import useFiatCurrencies from '../../hooks/useFiatCurrencies';
import useCryptoCurrencies from '../../hooks/useCryptoCurrencies';
import useLimits from '../../hooks/useLimits';
import useBalance from '../../hooks/useBalance';
import useAddressBalance from '../../../../../hooks/useAddressBalance/useAddressBalance';
import { Asset } from '../../../../../hooks/useAddressBalance/useAddressBalance.types';

import BaseSelectorButton from '../../../../../Base/SelectorButton';

import ScreenLayout from '../../components/ScreenLayout';
import Row from '../../components/Row';
import AssetSelectorButton from '../../components/AssetSelectorButton';
import PaymentMethodSelector from '../../components/PaymentMethodSelector';
import AmountInput from '../../components/AmountInput';
import Keypad, { Keys } from '../../../../../Base/Keypad';
import QuickAmounts from '../../components/QuickAmounts';
import AccountSelector from '../../components/AccountSelector';

import PaymentMethodIcon from '../../components/PaymentMethodIcon';
import ErrorViewWithReporting from '../../components/ErrorViewWithReporting';
import SkeletonText from '../../components/SkeletonText';
import ErrorView from '../../components/ErrorView';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import BadgeNetwork from '../../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';

import { NATIVE_ADDRESS } from '../../../../../../constants/on-ramp';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { strings } from '../../../../../../../locales/i18n';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  formatAmount,
  getCaipChainIdFromCryptoCurrency,
  getHexChainIdFromCryptoCurrency,
} from '../../utils';
import { createQuotesNavDetails } from '../Quotes/Quotes';
import { createTokenSelectModalNavigationDetails } from '../../components/TokenSelectModal/TokenSelectModal';
import { createFiatSelectorModalNavigationDetails } from '../../components/FiatSelectorModal';
import { createIncompatibleAccountTokenModalNavigationDetails } from '../../components/IncompatibleAccountTokenModal';
import { createRegionSelectorModalNavigationDetails } from '../../components/RegionSelectorModal';
import { createPaymentMethodSelectorModalNavigationDetails } from '../../components/PaymentMethodSelectorModal';
import { QuickAmount, RampIntent, ScreenLocation } from '../../types';
import { useStyles } from '../../../../../../component-library/hooks';

import {
  selectTicker,
  selectNetworkConfigurationsByCaipChainId,
} from '../../../../../../selectors/networkController';
import { getNetworkImageSource } from '../../../../../../util/networks';

import styleSheet from './BuildQuote.styles';
import {
  toTokenMinimalUnit,
  fromTokenMinimalUnitString,
} from '../../../../../../util/number';
import useGasPriceEstimation from '../../hooks/useGasPriceEstimation';
import useIntentAmount from '../../hooks/useIntentAmount';
import useERC20GasLimitEstimation from '../../hooks/useERC20GasLimitEstimation';

import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import { BuildQuoteSelectors } from './BuildQuote.testIds';

import { isNonEvmAddress } from '../../../../../../core/Multichain/utils';
import { trace, endTrace, TraceName } from '../../../../../../util/trace';

import { CHAIN_IDS } from '@metamask/transaction-controller';
import { createUnsupportedRegionModalNavigationDetails } from '../../components/UnsupportedRegionModal';
import { regex } from '../../../../../../util/regex';
import { createBuySettingsModalNavigationDetails } from '../Modals/Settings/SettingsModal';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SelectorButton = BaseSelectorButton as any;

interface BuildQuoteParams extends RampIntent {
  showBack?: boolean;
}

export const createBuildQuoteNavDetails = createNavigationDetails(
  Routes.RAMP.BUILD_QUOTE,
);

const BuildQuote = () => {
  const navigation = useNavigation();
  const params = useParams<BuildQuoteParams>();
  const { showBack } = params;

  // Memoize the intent object to prevent unnecessary re-renders
  const intent = useMemo(() => {
    const { showBack: _, ...intentParams } = params;
    return intentParams;
  }, [params]);

  const { styles, theme } = useStyles(styleSheet, {});
  const { colors, themeAppearance } = theme;
  const trackEvent = useAnalytics();
  const [amountFocused, setAmountFocused] = useState(false);
  const [amount, setAmount] = useState('0');
  const [amountNumber, setAmountNumber] = useState(0);
  const [amountBNMinimalUnit, setAmountBNMinimalUnit] = useState<BN4>();
  const [error, setError] = useState<string | null>(null);
  const [isKeyboardFreshlyOpened, setIsKeyboardFreshlyOpened] = useState(false);
  const [intentHandled, setIntentHandled] = useState(false);
  const keyboardHeight = useRef(1000);
  const keypadOffset = useSharedValue(1000);
  const nativeSymbol = useSelector(selectTicker);
  const networkConfigurationsByCaipChainId = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  /**
   * Grab the current state of the SDK via the context.
   */
  const {
    selectedPaymentMethodId,
    selectedRegion,
    selectedAsset,
    selectedFiatCurrencyId,
    selectedAddress,
    selectedNetworkName,
    sdkError,
    rampType,
    isBuy,
    isSell,
    setIntent,
  } = useRampSDK();

  useEffect(() => {
    if (intent && !intentHandled && Object.keys(intent || {}).length > 0) {
      setIntent(intent);
      setIntentHandled(true);
    }
  }, [intent, setIntent, intentHandled]);

  const screenLocation: ScreenLocation = isBuy
    ? 'Amount to Buy Screen'
    : 'Amount to Sell Screen';

  const {
    data: regions,
    isFetching: isFetchingRegions,
    error: errorRegions,
    query: queryGetRegions,
  } = useRegions();

  const {
    data: paymentMethods,
    error: errorPaymentMethods,
    isFetching: isFetchingPaymentMethods,
    query: queryGetPaymentMethods,
    currentPaymentMethod,
  } = usePaymentMethods();

  const paymentMethodIcons = useMemo(() => {
    if (!paymentMethods) {
      return [];
    }

    return [
      ...new Set(
        paymentMethods.reduce((acc, payment) => {
          const icons = payment.logo[themeAppearance] || [];
          return [...acc, ...icons];
        }, [] as string[]),
      ),
    ];
  }, [paymentMethods, themeAppearance]);

  const {
    queryDefaultFiatCurrency,
    fiatCurrencies,
    queryGetFiatCurrencies,
    errorFiatCurrency,
    isFetchingFiatCurrency,
    currentFiatCurrency,
  } = useFiatCurrencies();

  const {
    cryptoCurrencies,
    errorCryptoCurrencies,
    isFetchingCryptoCurrencies,
    queryGetCryptoCurrencies,
  } = useCryptoCurrencies();

  const {
    limits,
    isFetching: isFetchingLimits,
    isAmountBelowMinimum,
    isAmountAboveMaximum,
    isAmountValid,
  } = useLimits();

  useIntentAmount(
    setAmount,
    setAmountNumber,
    setAmountBNMinimalUnit,
    currentFiatCurrency,
  );

  useEffect(() => {
    setAmount('0');
    setAmountNumber(0);
  }, [selectedRegion]);

  const shouldShowUnsupportedModal = useMemo(
    () =>
      regions &&
      selectedRegion &&
      (selectedRegion.unsupported ||
        (isBuy && !selectedRegion.support?.buy) ||
        (isSell && !selectedRegion.support?.sell)),
    [regions, selectedRegion, isBuy, isSell],
  );

  useFocusEffect(
    useCallback(() => {
      if (shouldShowUnsupportedModal && selectedRegion) {
        // Use requestAnimationFrame to ensure navigation happens after render
        requestAnimationFrame(() => {
          navigation.navigate(
            ...createUnsupportedRegionModalNavigationDetails({
              regions: regions ?? [],
              region: selectedRegion,
            }),
          );
        });
      }
    }, [shouldShowUnsupportedModal, navigation, regions, selectedRegion]),
  );

  const gasLimitEstimation = useERC20GasLimitEstimation({
    tokenAddress: selectedAsset?.address,
    fromAddress: selectedAddress,
    chainId: selectedAsset?.network?.chainId || CHAIN_IDS.MAINNET,
    amount,
    decimals: selectedAsset?.decimals ?? 18, // Default ERC20 decimals
    isNativeToken: selectedAsset?.address === NATIVE_ADDRESS,
  });

  const gasPriceEstimation = useGasPriceEstimation({
    // 0 is set when buying since there's no transaction involved
    gasLimit: isBuy ? 0 : gasLimitEstimation,
    estimateRange: 'high',
  });

  const assetForBalance = useMemo(
    () =>
      selectedAsset && selectedAsset.address !== NATIVE_ADDRESS
        ? {
            address: selectedAsset.address,
            symbol: selectedAsset.symbol,
            decimals: selectedAsset.decimals,
          }
        : {
            isETH: true,
          },
    [selectedAsset],
  );

  const addressForBalance = useMemo(
    () =>
      selectedAddress && isNonEvmAddress(selectedAddress)
        ? undefined
        : selectedAddress,
    [selectedAddress],
  );

  const hexChainIdForBalance = useMemo(() => {
    if (!addressForBalance) {
      return;
    }
    return getHexChainIdFromCryptoCurrency(selectedAsset);
  }, [selectedAsset, addressForBalance]);

  const { addressBalance } = useAddressBalance(
    assetForBalance as Asset,
    addressForBalance ?? undefined,
    true,
    hexChainIdForBalance,
  );

  const { balanceFiat, balanceBN, balance } = useBalance(
    selectedAsset && selectedAddress && selectedAsset.network
      ? {
          chainId: selectedAsset.network.chainId,
          assetId: selectedAsset.assetId,
          address: selectedAsset.address,
          decimals: selectedAsset.decimals,
        }
      : undefined,
  );

  const { balanceBN: nativeTokenBalanceBN } = useBalance(
    isBuy || !selectedAsset || selectedAsset.address === NATIVE_ADDRESS
      ? undefined
      : {
          address: NATIVE_ADDRESS,
          decimals: 18,
        },
  );

  let maxSellAmount = null;
  if (selectedAsset && selectedAsset.address === NATIVE_ADDRESS) {
    maxSellAmount =
      balanceBN && gasPriceEstimation
        ? balanceBN?.sub(gasPriceEstimation.estimatedGasFee)
        : null;
  } else if (
    selectedAsset &&
    selectedAsset.address !== NATIVE_ADDRESS &&
    balanceBN
  ) {
    maxSellAmount = balanceBN;
  }

  const amountIsBelowMinimum = useMemo(
    () => isAmountBelowMinimum(amountNumber),
    [amountNumber, isAmountBelowMinimum],
  );

  const amountIsAboveMaximum = useMemo(
    () => isAmountAboveMaximum(amountNumber),
    [amountNumber, isAmountAboveMaximum],
  );

  const amountIsValid = useMemo(
    () => isAmountValid(amountNumber),
    [amountNumber, isAmountValid],
  );

  const amountIsOverGas = useMemo(() => {
    if (isBuy || !maxSellAmount) {
      return false;
    }
    return Boolean(amountBNMinimalUnit?.gt(maxSellAmount));
  }, [amountBNMinimalUnit, isBuy, maxSellAmount]);

  const hasInsufficientBalance = useMemo(() => {
    if (!amountBNMinimalUnit || amountBNMinimalUnit.isZero()) {
      return false;
    }
    if (!balanceBN) {
      return true;
    }
    return balanceBN.lt(amountBNMinimalUnit);
  }, [balanceBN, amountBNMinimalUnit]);

  const hasInsufficientNativeBalanceForGas = useMemo(() => {
    if (isBuy || (selectedAsset && selectedAsset.address === NATIVE_ADDRESS)) {
      return false;
    }

    if (!nativeTokenBalanceBN || !gasPriceEstimation) {
      return false;
    }

    return nativeTokenBalanceBN.lt(gasPriceEstimation.estimatedGasFee);
  }, [gasPriceEstimation, isBuy, nativeTokenBalanceBN, selectedAsset]);

  const displayBalance = useMemo(() => {
    if (!selectedAddress) {
      return null;
    }

    const isNonEvm = isNonEvmAddress(selectedAddress);
    const balanceValue = isNonEvm ? balance : addressBalance;

    return balanceValue ?? null;
  }, [selectedAddress, balance, addressBalance]);

  const caipChainId = getCaipChainIdFromCryptoCurrency(selectedAsset);

  const networkName = caipChainId
    ? networkConfigurationsByCaipChainId[caipChainId]?.name
    : undefined;
  const networkImageSource = caipChainId
    ? getNetworkImageSource({ chainId: caipChainId })
    : undefined;

  const isFetching =
    isFetchingRegions ||
    isFetchingFiatCurrency ||
    isFetchingCryptoCurrencies ||
    isFetchingPaymentMethods ||
    isFetchingLimits;

  const handleCancelPress = useCallback(() => {
    if (!selectedAsset?.network?.chainId) {
      return;
    }

    if (isBuy) {
      trackEvent('ONRAMP_CANCELED', {
        location: screenLocation,
        chain_id_destination: selectedAsset.network.chainId,
      });
    } else {
      trackEvent('OFFRAMP_CANCELED', {
        location: screenLocation,
        chain_id_source: selectedAsset.network.chainId,
      });
    }
  }, [screenLocation, isBuy, selectedAsset?.network?.chainId, trackEvent]);

  const handleConfigurationPress = useCallback(() => {
    navigation.navigate(...createBuySettingsModalNavigationDetails());
  }, [navigation]);

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        {
          title: isBuy
            ? strings('fiat_on_ramp_aggregator.amount_to_buy')
            : strings('fiat_on_ramp_aggregator.amount_to_sell'),
          showBack: showBack ?? false,
          showConfiguration: isBuy,
          onConfigurationPress: handleConfigurationPress,
        },
        theme,
        handleCancelPress,
      ),
    );
  }, [
    navigation,
    theme,
    handleCancelPress,
    showBack,
    isBuy,
    handleConfigurationPress,
  ]);

  /**
   * * Keypad style, handlers and effects
   */
  const keypadContainerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withTiming(keypadOffset.value),
      },
    ],
  }));

  useEffect(() => {
    keypadOffset.value = amountFocused ? 40 : keyboardHeight.current + 80;
  }, [amountFocused, keyboardHeight, keypadOffset]);

  /**
   * Back handler to dismiss keypad
   */
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (amountFocused) {
          setAmountFocused(false);
          setIsKeyboardFreshlyOpened(false);
          return true;
        }
      },
    );

    return () => backHandler.remove();
  }, [amountFocused]);

  const handleKeypadDone = useCallback(() => {
    setAmountFocused(false);
    setIsKeyboardFreshlyOpened(false);
  }, []);
  const onAmountInputPress = useCallback(() => {
    setAmountFocused(true);
    setIsKeyboardFreshlyOpened(true);
  }, []);

  const handleKeypadChange = useCallback(
    ({
      value,
      valueAsNumber,
      pressedKey,
    }: {
      value: string;
      valueAsNumber: number;
      pressedKey: Keys;
    }) => {
      let newValue = `${value}`;
      let newValueAsNumber = valueAsNumber;

      if (isKeyboardFreshlyOpened && regex.hasOneDigit.test(pressedKey)) {
        newValue = pressedKey;
        newValueAsNumber = Number(pressedKey);
      }

      setAmount(newValue);
      setAmountNumber(newValueAsNumber);

      if (isSell) {
        setAmountBNMinimalUnit(
          toTokenMinimalUnit(newValue, selectedAsset?.decimals ?? 0) as BN4,
        );
      }

      setIsKeyboardFreshlyOpened(false);
    },
    [isSell, selectedAsset?.decimals, isKeyboardFreshlyOpened],
  );

  const handleQuickAmountPress = useCallback(
    ({ value }: QuickAmount) => {
      if (isBuy) {
        setAmount(`${value}`);
        setAmountNumber(value);
      } else {
        const percentage = value * 100;
        const amountPercentage = balanceBN
          ?.mul(new BN4(percentage))
          .div(new BN4(100));

        if (!amountPercentage) {
          return;
        }

        let amountToSet = amountPercentage;

        if (
          selectedAsset?.address === NATIVE_ADDRESS &&
          maxSellAmount?.lt(amountPercentage)
        ) {
          amountToSet = maxSellAmount;
        }

        const newAmountString = fromTokenMinimalUnitString(
          amountToSet.toString(10),
          selectedAsset?.decimals ?? 18,
        );
        setAmountBNMinimalUnit(amountToSet);
        setAmount(newAmountString);
        setAmountNumber(Number(newAmountString));
      }
    },
    [
      balanceBN,
      isBuy,
      maxSellAmount,
      selectedAsset?.address,
      selectedAsset?.decimals,
    ],
  );

  const onKeypadLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    keyboardHeight.current = height;
  }, []);

  /**
   * * Region handlers
   */

  const handleChangeRegion = useCallback(() => {
    setAmountFocused(false);
    if (regions && regions.length > 0) {
      navigation.navigate(
        ...createRegionSelectorModalNavigationDetails({
          regions,
        }),
      );
    }
  }, [navigation, regions, setAmountFocused]);

  /**
   * * CryptoCurrency handlers
   */

  const handleAssetSelectorPress = useCallback(() => {
    setAmountFocused(false);
    navigation.navigate(
      ...createTokenSelectModalNavigationDetails({
        tokens: cryptoCurrencies ?? [],
      }),
    );
  }, [navigation, cryptoCurrencies]);

  /**
   * * FiatCurrency handlers
   */

  const handleFiatSelectorPress = useCallback(() => {
    setAmountFocused(false);
    navigation.navigate(
      ...createFiatSelectorModalNavigationDetails({
        currencies: fiatCurrencies ?? [],
      }),
    );
  }, [navigation, fiatCurrencies]);

  /**
   * * PaymentMethod handlers
   */

  const handleShowPaymentMethodsModal = useCallback(() => {
    setAmountFocused(false);
    navigation.navigate(
      ...createPaymentMethodSelectorModalNavigationDetails({
        paymentMethods,
        location: screenLocation,
      }),
    );
  }, [navigation, paymentMethods, screenLocation]);

  /**
   * * Get Quote handlers
   */
  const handleGetQuotePress = useCallback(() => {
    if (!selectedAddress) {
      navigation.navigate(
        ...createIncompatibleAccountTokenModalNavigationDetails(),
      );
      return;
    }

    if (selectedAsset && currentFiatCurrency) {
      navigation.navigate(
        ...createQuotesNavDetails({
          amount: isBuy ? amountNumber : amount,
          asset: selectedAsset,
          fiatCurrency: currentFiatCurrency,
        }),
      );

      const analyticsPayload = {
        payment_method_id: selectedPaymentMethodId as string,
        amount: amountNumber,
        location: screenLocation,
      };

      trace({
        name: TraceName.RampQuoteLoading,
        tags: {
          rampType,
        },
      });
      if (isBuy) {
        trackEvent('ONRAMP_QUOTES_REQUESTED', {
          ...analyticsPayload,
          currency_source: currentFiatCurrency.symbol,
          currency_destination: selectedAsset.symbol,
          currency_destination_symbol: selectedAsset.symbol,
          currency_destination_network: selectedAsset.network?.shortName,
          chain_id_destination: selectedAsset.network?.chainId,
        });
      } else {
        trackEvent('OFFRAMP_QUOTES_REQUESTED', {
          ...analyticsPayload,
          currency_destination: currentFiatCurrency.symbol,
          currency_source: selectedAsset.symbol,
          currency_source_symbol: selectedAsset.symbol,
          currency_source_network: selectedAsset.network?.shortName,
          chain_id_source: selectedAsset.network?.chainId,
        });
      }
    }
  }, [
    rampType,
    selectedAddress,
    screenLocation,
    amount,
    amountNumber,
    currentFiatCurrency,
    isBuy,
    navigation,
    selectedAsset,
    selectedPaymentMethodId,
    trackEvent,
  ]);

  const retryMethod = useCallback(() => {
    if (!error) {
      return null;
    }

    if (errorCryptoCurrencies) {
      return queryGetCryptoCurrencies();
    } else if (errorPaymentMethods) {
      return queryGetPaymentMethods();
    } else if (errorFiatCurrency) {
      queryDefaultFiatCurrency();
      return queryGetFiatCurrencies();
    } else if (errorRegions) {
      return queryGetRegions();
    }
  }, [
    error,
    errorRegions,
    errorFiatCurrency,
    errorPaymentMethods,
    errorCryptoCurrencies,
    queryDefaultFiatCurrency,
    queryGetRegions,
    queryGetCryptoCurrencies,
    queryGetFiatCurrencies,
    queryGetPaymentMethods,
  ]);

  useEffect(() => {
    setError(
      (errorCryptoCurrencies ||
        errorPaymentMethods ||
        errorFiatCurrency ||
        errorRegions) ??
        null,
    );
  }, [
    errorRegions,
    errorFiatCurrency,
    errorPaymentMethods,
    errorCryptoCurrencies,
  ]);

  const [shouldEndTrace, setShouldEndTrace] = useState(true);
  useEffect(() => {
    if (
      shouldEndTrace &&
      !sdkError &&
      !error &&
      !isFetching &&
      cryptoCurrencies &&
      cryptoCurrencies.length > 0
    ) {
      endTrace({
        name: TraceName.LoadRampExperience,
      });
      setShouldEndTrace(false);
    }
  }, [cryptoCurrencies, error, isFetching, rampType, sdkError, shouldEndTrace]);

  if (sdkError) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorViewWithReporting error={sdkError} location={screenLocation} />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView
            description={error}
            ctaOnPress={retryMethod}
            location={screenLocation}
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (!isFetching && cryptoCurrencies && cryptoCurrencies.length === 0) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView
            icon="info"
            title={strings('fiat_on_ramp_aggregator.no_tokens_available_title')}
            description={strings(
              isBuy
                ? 'fiat_on_ramp_aggregator.no_tokens_available'
                : 'fiat_on_ramp_aggregator.no_sell_tokens_available',
              {
                network:
                  selectedNetworkName ||
                  strings('fiat_on_ramp_aggregator.this_network'),
                region: selectedRegion?.name,
              },
            )}
            ctaLabel={strings(
              isBuy
                ? 'fiat_on_ramp_aggregator.change_payment_method'
                : 'fiat_on_ramp_aggregator.change_cash_destination',
            )}
            ctaOnPress={handleShowPaymentMethodsModal}
            location={screenLocation}
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  // If the current view is for Sell the amount (crypto) is displayed as is
  let displayAmount = `${amount} ${selectedAsset?.symbol ?? ''}`;

  // If the current ivew is for Buy we will format the amount
  if (isBuy) {
    // Split the amount to detect if it has decimals
    const splitAmount = amount.split(/(\.)|(,)/);
    // If the splitAmount array has more than 1 element it means that the amount has decimals
    // For example:
    //    100.50 -> splitAmount = ['100', '.', undefined, '50']
    //    100,50 -> splitAmount = ['100', undefined, ',', '50']
    // Note: this help us capture the input separator (dot or comma)
    const hasDecimalsSplit = splitAmount.length > 1;

    displayAmount =
      isBuy && amountFocused
        ? // If the amount is focused (being edited) the amount integer part will be shown in groups separated by spaces
          `${formatAmount(Math.trunc(amountNumber), true)}${
            // If the amount has decimals the decimal part will be shown
            // using the separator and the decimal part
            // Note, the decimal part will be displayed even if it is being typed (ends with a separator or 0)
            hasDecimalsSplit
              ? `${splitAmount[1] ?? splitAmount[2] ?? ''}${
                  splitAmount[3] ?? ''
                }`
              : ''
          }`
        : // If the amount is not focused it will be fully formatted
          formatAmount(amountNumber);
  }

  let quickAmounts: QuickAmount[] = [];

  if (isBuy) {
    quickAmounts =
      limits?.quickAmounts?.map((quickAmount) => ({
        value: quickAmount,
        label: currentFiatCurrency?.denomSymbol + quickAmount.toString(),
      })) ?? [];
  } else if (
    balanceBN &&
    !balanceBN.isZero() &&
    maxSellAmount?.gt(new BN4(0))
  ) {
    quickAmounts = [
      { value: 0.25, label: '25%' },
      { value: 0.5, label: '50%' },
      { value: 0.75, label: '75%' },
      {
        value: 1,
        label: strings('fiat_on_ramp_aggregator.max'),
        isNative: selectedAsset?.address === NATIVE_ADDRESS,
      },
    ];
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <Pressable
          onPress={handleKeypadDone}
          style={styles.viewContainer}
          accessible={false}
        >
          <ScreenLayout.Content>
            <Row style={styles.selectors}>
              <AccountSelector isEvmOnly={isSell} />
              <View style={styles.spacer} />
              {isFetchingRegions ? (
                <SkeletonText thick />
              ) : (
                <SelectorButton
                  accessibilityRole="button"
                  accessible
                  onPress={handleChangeRegion}
                  testID={BuildQuoteSelectors.REGION_DROPDOWN}
                >
                  <Text style={styles.flagText}>{selectedRegion?.emoji}</Text>
                </SelectorButton>
              )}
              {isSell ? (
                <>
                  <View style={styles.spacer} />
                  {isFetchingRegions ||
                  isFetchingFiatCurrency ||
                  !selectedFiatCurrencyId ? (
                    <SkeletonText thick />
                  ) : (
                    <SelectorButton
                      accessibilityRole="button"
                      accessible
                      onPress={handleFiatSelectorPress}
                    >
                      <Text variant={TextVariant.BodyLGMedium}>
                        {currentFiatCurrency?.symbol}
                      </Text>
                    </SelectorButton>
                  )}
                </>
              ) : null}
            </Row>
            <AssetSelectorButton
              loading={
                isFetchingRegions ||
                isFetchingFiatCurrency ||
                isFetchingCryptoCurrencies ||
                !selectedAsset?.id
              }
              label={
                isBuy
                  ? strings('fiat_on_ramp_aggregator.want_to_buy')
                  : strings('fiat_on_ramp_aggregator.want_to_sell')
              }
              icon={
                <BadgeWrapper
                  badgePosition={BadgePosition.BottomRight}
                  badgeElement={
                    networkName && networkImageSource ? (
                      <BadgeNetwork
                        name={networkName}
                        imageSource={networkImageSource}
                      />
                    ) : null
                  }
                >
                  <AvatarToken
                    name={selectedAsset?.symbol}
                    src={{ uri: selectedAsset?.logo }}
                    size={AvatarTokenSize.Lg}
                    key={selectedAsset?.logo}
                  />
                </BadgeWrapper>
              }
              assetSymbol={selectedAsset?.symbol ?? ''}
              assetName={selectedAsset?.name ?? ''}
              onPress={handleAssetSelectorPress}
            />
            <Row>
              {isFetchingRegions ||
              isFetchingFiatCurrency ||
              isFetchingCryptoCurrencies ||
              !selectedAsset?.id ? (
                <SkeletonText thin medium />
              ) : (
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {displayBalance !== null && (
                    <>
                      {strings('fiat_on_ramp_aggregator.current_balance')}:{' '}
                      {displayBalance}
                      {balanceFiat ? ` ≈ ${balanceFiat}` : null}
                    </>
                  )}
                </Text>
              )}
            </Row>

            <AmountInput
              highlighted={amountFocused}
              label={strings('fiat_on_ramp_aggregator.amount')}
              currencySymbol={
                isBuy ? currentFiatCurrency?.denomSymbol : undefined
              }
              amount={displayAmount}
              highlightedError={
                amountNumber > 0 && (!amountIsValid || amountIsOverGas)
              }
              currencyCode={isBuy ? currentFiatCurrency?.symbol : undefined}
              onPress={onAmountInputPress}
              loading={
                isFetchingRegions ||
                isFetchingFiatCurrency ||
                !selectedFiatCurrencyId
              }
              onCurrencyPress={isBuy ? handleFiatSelectorPress : undefined}
            />
            {amountNumber > 0 &&
              amountIsValid &&
              !hasInsufficientBalance &&
              amountIsOverGas && (
                <Row>
                  <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                    {strings('fiat_on_ramp_aggregator.enter_lower_gas_fees')}
                  </Text>
                </Row>
              )}
            {hasInsufficientBalance && (
              <Row>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Error}
                  testID={BuildQuoteSelectors.INSUFFICIENT_BALANCE_ERROR}
                >
                  {strings('fiat_on_ramp_aggregator.insufficient_balance')}
                </Text>
              </Row>
            )}
            {!hasInsufficientBalance && hasInsufficientNativeBalanceForGas && (
              <Row>
                <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                  {strings(
                    'fiat_on_ramp_aggregator.insufficient_native_balance',
                    { currency: nativeSymbol },
                  )}
                </Text>
              </Row>
            )}
            {!hasInsufficientBalance && amountIsBelowMinimum && limits && (
              <Row>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Error}
                  testID={BuildQuoteSelectors.MIN_LIMIT_ERROR}
                >
                  {isBuy ? (
                    <>
                      {strings('fiat_on_ramp_aggregator.minimum')}{' '}
                      {currentFiatCurrency?.denomSymbol}
                      {formatAmount(limits.minAmount)}
                    </>
                  ) : (
                    strings('fiat_on_ramp_aggregator.enter_larger_amount')
                  )}
                </Text>
              </Row>
            )}
            {!hasInsufficientBalance && amountIsAboveMaximum && limits && (
              <Row>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Error}
                  testID={BuildQuoteSelectors.MAX_LIMIT_ERROR}
                >
                  {isBuy ? (
                    <>
                      {strings('fiat_on_ramp_aggregator.maximum')}{' '}
                      {currentFiatCurrency?.denomSymbol}
                      {formatAmount(limits.maxAmount)}
                    </>
                  ) : (
                    strings('fiat_on_ramp_aggregator.enter_smaller_amount')
                  )}
                </Text>
              </Row>
            )}
            <Row>
              <PaymentMethodSelector
                loading={
                  isFetchingRegions ||
                  isFetchingFiatCurrency ||
                  isFetchingCryptoCurrencies ||
                  isFetchingPaymentMethods ||
                  !selectedPaymentMethodId
                }
                label={
                  isBuy
                    ? strings('fiat_on_ramp_aggregator.update_payment_method')
                    : strings('fiat_on_ramp_aggregator.send_cash_to')
                }
                icon={
                  <PaymentMethodIcon
                    paymentMethodIcons={currentPaymentMethod?.icons}
                    paymentMethodType={currentPaymentMethod?.paymentType}
                    size={20}
                    color={colors.icon.default}
                  />
                }
                name={currentPaymentMethod?.name}
                onPress={handleShowPaymentMethodsModal}
                paymentMethodIcons={paymentMethodIcons}
              />
            </Row>
          </ScreenLayout.Content>
        </Pressable>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <Row style={styles.cta}>
            <Button
              size={ButtonSize.Lg}
              onPress={handleGetQuotePress}
              label={strings('fiat_on_ramp_aggregator.get_quotes')}
              variant={ButtonVariants.Primary}
              width={ButtonWidthTypes.Full}
              isDisabled={amountNumber <= 0 || isFetching}
              accessibilityRole="button"
            />
          </Row>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>

      <Animated.View
        style={[styles.keypadContainer, keypadContainerStyle]}
        onLayout={onKeypadLayout}
      >
        <QuickAmounts
          isBuy={isBuy}
          onAmountPress={handleQuickAmountPress}
          amounts={quickAmounts}
        />
        <Keypad
          style={styles.keypad}
          value={amount}
          onChange={handleKeypadChange}
          currency={
            isBuy
              ? currentFiatCurrency?.symbol
              : `${selectedAsset?.symbol}-crypto`
          }
          decimals={
            isBuy ? currentFiatCurrency?.decimals : selectedAsset?.decimals
          }
        />
        <ScreenLayout.Content>
          <Button
            size={ButtonSize.Lg}
            onPress={handleKeypadDone}
            label={strings('fiat_on_ramp_aggregator.done')}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
            accessibilityRole="button"
          />
        </ScreenLayout.Content>
      </Animated.View>
    </ScreenLayout>
  );
};

export default BuildQuote;
