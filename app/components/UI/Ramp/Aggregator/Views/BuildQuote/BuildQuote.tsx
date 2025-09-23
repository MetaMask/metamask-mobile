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
import { useNavigation } from '@react-navigation/native';
import BN4 from 'bnjs4';

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
import useModalHandler from '../../../../../Base/hooks/useModalHandler';

import BaseSelectorButton from '../../../../../Base/SelectorButton';
import StyledButton from '../../../../StyledButton';

import ScreenLayout from '../../components/ScreenLayout';
import Box from '../../components/Box';
import Row from '../../components/Row';
import AssetSelectorButton from '../../components/AssetSelectorButton';
import PaymentMethodSelector from '../../components/PaymentMethodSelector';
import AmountInput from '../../components/AmountInput';
import Keypad from '../../../../../Base/Keypad';
import QuickAmounts from '../../components/QuickAmounts';
import AccountSelector from '../../components/AccountSelector';
import TokenIcon from '../../../../Swaps/components/TokenIcon';
import TokenSelectModal from '../../components/TokenSelectModal';
import PaymentMethodModal from '../../components/PaymentMethodModal';
import PaymentMethodIcon from '../../components/PaymentMethodIcon';
import FiatSelectModal from '../../components/modals/FiatSelectModal';
import ErrorViewWithReporting from '../../components/ErrorViewWithReporting';
import RegionModal from '../../components/RegionModal';
import SkeletonText from '../../components/SkeletonText';
import ErrorView from '../../components/ErrorView';

import { NATIVE_ADDRESS } from '../../../../../../constants/on-ramp';
import { getFiatOnRampAggNavbar } from '../../../../Navbar';
import { strings } from '../../../../../../../locales/i18n';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { formatAmount } from '../../utils';
import { createQuotesNavDetails } from '../Quotes/Quotes';
import { QuickAmount, Region, ScreenLocation } from '../../types';
import { useStyles } from '../../../../../../component-library/hooks';
import { selectTicker } from '../../../../../../selectors/networkController';

import styleSheet from './BuildQuote.styles';
import {
  toTokenMinimalUnit,
  fromTokenMinimalUnitString,
} from '../../../../../../util/number';
import useGasPriceEstimation from '../../hooks/useGasPriceEstimation';
import useIntentAmount from '../../hooks/useIntentAmount';
import useERC20GasLimitEstimation from '../../hooks/useERC20GasLimitEstimation';

import ListItem from '../../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import ListItemColumnEnd from '../../components/ListItemColumnEnd';
import { BuildQuoteSelectors } from '../../../../../../../e2e/selectors/Ramps/BuildQuote.selectors';

import { CryptoCurrency, FiatCurrency, Payment } from '@consensys/on-ramp-sdk';
import { isNonEvmAddress } from '../../../../../../core/Multichain/utils';
import { trace, endTrace, TraceName } from '../../../../../../util/trace';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SelectorButton = BaseSelectorButton as any;

interface BuildQuoteParams {
  showBack?: boolean;
}

export const createBuildQuoteNavDetails =
  createNavigationDetails<BuildQuoteParams>(Routes.RAMP.BUILD_QUOTE);

const BuildQuote = () => {
  const navigation = useNavigation();
  const params = useParams<BuildQuoteParams>();
  const {
    styles,
    theme: { colors, themeAppearance },
  } = useStyles(styleSheet, {});
  const trackEvent = useAnalytics();
  const [amountFocused, setAmountFocused] = useState(false);
  const [amount, setAmount] = useState('0');
  const [amountNumber, setAmountNumber] = useState(0);
  const [amountBNMinimalUnit, setAmountBNMinimalUnit] = useState<BN4>();
  const [error, setError] = useState<string | null>(null);
  const keyboardHeight = useRef(1000);
  const keypadOffset = useSharedValue(1000);
  const [
    isTokenSelectorModalVisible,
    toggleTokenSelectorModal,
    ,
    hideTokenSelectorModal,
  ] = useModalHandler(false);
  const [
    isFiatSelectorModalVisible,
    toggleFiatSelectorModal,
    ,
    hideFiatSelectorModal,
  ] = useModalHandler(false);
  const [
    isPaymentMethodModalVisible,
    ,
    showPaymentMethodsModal,
    hidePaymentMethodModal,
  ] = useModalHandler(false);
  const [isRegionModalVisible, toggleRegionModal, , hideRegionModal] =
    useModalHandler(false);

  const nativeSymbol = useSelector(selectTicker);

  /**
   * Grab the current state of the SDK via the context.
   */
  const {
    selectedPaymentMethodId,
    setSelectedPaymentMethodId,
    selectedRegion,
    setSelectedRegion,
    selectedAsset,
    setSelectedAsset,
    selectedFiatCurrencyId,
    setSelectedFiatCurrencyId,
    selectedAddress,
    selectedChainId,
    selectedNetworkName,
    sdkError,
    rampType,
    isBuy,
    isSell,
  } = useRampSDK();

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
    defaultFiatCurrency,
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

  const { limits, isAmountBelowMinimum, isAmountAboveMaximum, isAmountValid } =
    useLimits();

  useIntentAmount(
    setAmount,
    setAmountNumber,
    setAmountBNMinimalUnit,
    currentFiatCurrency,
  );

  const gasLimitEstimation = useERC20GasLimitEstimation({
    tokenAddress: selectedAsset?.address,
    fromAddress: selectedAddress,
    chainId: selectedChainId,
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
    () => (isNonEvmAddress(selectedAddress) ? undefined : selectedAddress),
    [selectedAddress],
  );

  const { addressBalance } = useAddressBalance(
    assetForBalance as Asset,
    addressForBalance,
    true,
  );

  const { balanceFiat, balanceBN, balance } = useBalance(
    selectedAsset
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

  const isFetching =
    isFetchingCryptoCurrencies ||
    isFetchingPaymentMethods ||
    isFetchingFiatCurrency ||
    isFetchingRegions;

  const handleCancelPress = useCallback(() => {
    if (isBuy) {
      trackEvent('ONRAMP_CANCELED', {
        location: screenLocation,
        chain_id_destination: selectedChainId,
      });
    } else {
      trackEvent('OFFRAMP_CANCELED', {
        location: screenLocation,
        chain_id_source: selectedChainId,
      });
    }
  }, [screenLocation, isBuy, selectedChainId, trackEvent]);

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        {
          title: isBuy
            ? strings('fiat_on_ramp_aggregator.amount_to_buy')
            : strings('fiat_on_ramp_aggregator.amount_to_sell'),
          showBack: params.showBack,
        },
        colors,
        handleCancelPress,
      ),
    );
  }, [navigation, colors, handleCancelPress, params.showBack, isBuy]);

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
          return true;
        }
      },
    );

    return () => backHandler.remove();
  }, [amountFocused]);

  const handleKeypadDone = useCallback(() => setAmountFocused(false), []);
  const onAmountInputPress = useCallback(() => setAmountFocused(true), []);

  const handleKeypadChange = useCallback(
    ({ value, valueAsNumber }: { value: string; valueAsNumber: number }) => {
      setAmount(`${value}`);
      setAmountNumber(valueAsNumber);
      if (isSell) {
        setAmountBNMinimalUnit(
          toTokenMinimalUnit(`${value}`, selectedAsset?.decimals ?? 0) as BN4,
        );
      }
    },
    [isSell, selectedAsset?.decimals],
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
    toggleRegionModal();
  }, [toggleRegionModal]);

  const handleRegionPress = useCallback(
    async (region: Region) => {
      hideRegionModal();
      setAmount('0');
      setAmountNumber(0);
      if (selectedFiatCurrencyId === defaultFiatCurrency?.id) {
        /*
         * Selected fiat currency is default, we will fetch
         * and select new region default fiat currency
         */
        const newRegionCurrency = await queryDefaultFiatCurrency(
          region.id,
          selectedPaymentMethodId ? [selectedPaymentMethodId] : null,
        );
        setSelectedFiatCurrencyId(newRegionCurrency?.id);
      }
      setSelectedRegion(region);
    },
    [
      defaultFiatCurrency?.id,
      hideRegionModal,
      queryDefaultFiatCurrency,
      selectedFiatCurrencyId,
      selectedPaymentMethodId,
      setSelectedFiatCurrencyId,
      setSelectedRegion,
    ],
  );

  /**
   * * CryptoCurrency handlers
   */

  const handleAssetSelectorPress = useCallback(() => {
    setAmountFocused(false);
    toggleTokenSelectorModal();
  }, [toggleTokenSelectorModal]);

  const handleAssetPress = useCallback(
    (newAsset: CryptoCurrency) => {
      setSelectedAsset(newAsset);
      hideTokenSelectorModal();
    },
    [hideTokenSelectorModal, setSelectedAsset],
  );

  /**
   * * FiatCurrency handlers
   */

  const handleFiatSelectorPress = useCallback(() => {
    setAmountFocused(false);
    toggleFiatSelectorModal();
  }, [toggleFiatSelectorModal]);

  const handleCurrencyPress = useCallback(
    (fiatCurrency: FiatCurrency) => {
      setSelectedFiatCurrencyId(fiatCurrency?.id);
      setAmount('0');
      setAmountNumber(0);
      hideFiatSelectorModal();
    },
    [hideFiatSelectorModal, setSelectedFiatCurrencyId],
  );

  /**
   * * PaymentMethod handlers
   */

  const handleChangePaymentMethod = useCallback(
    (paymentMethodId?: Payment['id']) => {
      if (paymentMethodId) {
        setSelectedPaymentMethodId(paymentMethodId);
      }
      hidePaymentMethodModal();
    },
    [hidePaymentMethodModal, setSelectedPaymentMethodId],
  );

  /**
   * * Get Quote handlers
   */
  const handleGetQuotePress = useCallback(() => {
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
          chain_id_destination: selectedChainId,
        });
      } else {
        trackEvent('OFFRAMP_QUOTES_REQUESTED', {
          ...analyticsPayload,
          currency_destination: currentFiatCurrency.symbol,
          currency_source: selectedAsset.symbol,
          chain_id_source: selectedChainId,
        });
      }
    }
  }, [
    rampType,
    screenLocation,
    amount,
    amountNumber,
    currentFiatCurrency,
    isBuy,
    navigation,
    selectedAsset,
    selectedChainId,
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

  if (isFetching) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ScreenLayout.Content>
            <View style={styles.flexRow}>
              <SkeletonText large thick />
              <SkeletonText thick smaller spacingHorizontal />
            </View>
            <SkeletonText thin small spacingTop spacingVertical />
            <Box compact>
              <ListItem>
                <ListItemColumn>
                  <SkeletonText />
                </ListItemColumn>
                <ListItemColumnEnd widthType={WidthType.Fill}>
                  <SkeletonText thin smaller />
                </ListItemColumnEnd>
              </ListItem>
            </Box>
            <SkeletonText spacingTopSmall spacingVertical thin medium />
            <SkeletonText thin smaller spacingVertical />
            <Box compact>
              <ListItem>
                <ListItemColumn>
                  <View style={styles.flexRow}>
                    <SkeletonText medium />
                  </View>
                </ListItemColumn>
                <ListItemColumnEnd widthType={WidthType.Fill}>
                  <SkeletonText thin small />
                </ListItemColumnEnd>
              </ListItem>
            </Box>
            <SkeletonText spacingTopSmall spacingVertical thin medium />
          </ScreenLayout.Content>
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
            ctaOnPress={showPaymentMethodsModal as () => void}
            location={screenLocation}
          />
        </ScreenLayout.Body>
        <PaymentMethodModal
          isVisible={isPaymentMethodModalVisible}
          dismiss={hidePaymentMethodModal as () => void}
          title={strings(
            isBuy
              ? 'fiat_on_ramp_aggregator.select_payment_method'
              : 'fiat_on_ramp_aggregator.select_cash_destination',
          )}
          paymentMethods={paymentMethods}
          selectedPaymentMethodId={selectedPaymentMethodId}
          selectedPaymentMethodType={currentPaymentMethod?.paymentType}
          onItemPress={handleChangePaymentMethod}
          selectedRegion={selectedRegion}
          location={screenLocation}
          rampType={rampType}
        />
      </ScreenLayout>
    );
  }

  // If the current view is for Sell the amount (crypto) is displayed as is
  let displayAmount = `${amount} ${selectedAsset?.symbol}`;

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
              <SelectorButton
                accessibilityRole="button"
                accessible
                onPress={handleChangeRegion}
                testID={BuildQuoteSelectors.REGION_DROPDOWN}
              >
                <Text style={styles.flagText}>{selectedRegion?.emoji}</Text>
              </SelectorButton>
              {isSell ? (
                <>
                  <View style={styles.spacer} />
                  <SelectorButton
                    accessibilityRole="button"
                    accessible
                    onPress={handleFiatSelectorPress}
                  >
                    <Text variant={TextVariant.BodyLGMedium}>
                      {currentFiatCurrency?.symbol}
                    </Text>
                  </SelectorButton>
                </>
              ) : null}
            </Row>
            <AssetSelectorButton
              label={
                isBuy
                  ? strings('fiat_on_ramp_aggregator.want_to_buy')
                  : strings('fiat_on_ramp_aggregator.want_to_sell')
              }
              icon={
                <TokenIcon
                  medium
                  icon={selectedAsset?.logo}
                  symbol={selectedAsset?.symbol}
                />
              }
              assetSymbol={selectedAsset?.symbol ?? ''}
              assetName={selectedAsset?.name ?? ''}
              onPress={handleAssetSelectorPress}
            />
            {addressBalance ? (
              <Row>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings('fiat_on_ramp_aggregator.current_balance')}:{' '}
                  {selectedAsset?.assetId && balance ? balance : addressBalance}
                  {balanceFiat ? ` ≈ ${balanceFiat}` : null}
                </Text>
              </Row>
            ) : null}

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
                onPress={showPaymentMethodsModal as () => void}
                paymentMethodIcons={paymentMethodIcons}
              />
            </Row>
          </ScreenLayout.Content>
        </Pressable>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <Row style={styles.cta}>
            <StyledButton
              type="confirm"
              onPress={handleGetQuotePress}
              accessibilityRole="button"
              accessible
              disabled={amountNumber <= 0}
            >
              {strings('fiat_on_ramp_aggregator.get_quotes')}
            </StyledButton>
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
          <StyledButton
            type="confirm"
            onPress={handleKeypadDone}
            accessibilityRole="button"
            accessible
          >
            {strings('fiat_on_ramp_aggregator.done')}
          </StyledButton>
        </ScreenLayout.Content>
      </Animated.View>
      <TokenSelectModal
        isVisible={isTokenSelectorModalVisible}
        dismiss={toggleTokenSelectorModal as () => void}
        title={strings('fiat_on_ramp_aggregator.select_a_cryptocurrency')}
        description={strings(
          'fiat_on_ramp_aggregator.select_a_cryptocurrency_description',
          {
            network:
              selectedNetworkName ||
              strings('fiat_on_ramp_aggregator.this_network'),
          },
        )}
        tokens={cryptoCurrencies ?? []}
        onItemPress={handleAssetPress}
      />
      <FiatSelectModal
        isVisible={isFiatSelectorModalVisible}
        dismiss={toggleFiatSelectorModal as () => void}
        title={strings('fiat_on_ramp_aggregator.select_region_currency')}
        currencies={fiatCurrencies}
        onItemPress={handleCurrencyPress}
      />
      <PaymentMethodModal
        isVisible={isPaymentMethodModalVisible}
        dismiss={hidePaymentMethodModal as () => void}
        title={strings(
          isBuy
            ? 'fiat_on_ramp_aggregator.select_payment_method'
            : 'fiat_on_ramp_aggregator.select_cash_destination',
        )}
        paymentMethods={paymentMethods}
        selectedPaymentMethodId={selectedPaymentMethodId}
        selectedPaymentMethodType={currentPaymentMethod?.paymentType}
        onItemPress={handleChangePaymentMethod}
        selectedRegion={selectedRegion}
        location={screenLocation}
        rampType={rampType}
      />
      <RegionModal
        isVisible={isRegionModalVisible}
        title={strings('fiat_on_ramp_aggregator.region.title')}
        description={strings(
          isBuy
            ? 'fiat_on_ramp_aggregator.region.description'
            : 'fiat_on_ramp_aggregator.region.sell_description',
        )}
        data={regions}
        dismiss={hideRegionModal as () => void}
        onRegionPress={handleRegionPress}
        location={screenLocation}
        selectedRegion={selectedRegion}
        rampType={rampType}
      />
    </ScreenLayout>
  );
};

export default BuildQuote;
