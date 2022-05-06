import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Pressable, View, BackHandler } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useFiatOnRampSDK, useSDKMethod } from '../sdk';

import useModalHandler from '../../../Base/hooks/useModalHandler';
import Text from '../../../Base/Text';
import SelectorButton from '../../../Base/SelectorButton';
import StyledButton from '../../StyledButton';

import ScreenLayout from '../components/ScreenLayout';
import AssetSelectorButton from '../components/AssetSelectorButton';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import AmountInput from '../components/AmountInput';
import Keypad from '../components/Keypad';
import QuickAmounts from '../components/QuickAmounts';
import AccountSelector from '../components/AccountSelector';
import TokenIcon from '../../Swaps/components/TokenIcon';

import TokenSelectModal from '../components/TokenSelectModal';
import PaymentMethodModal from '../components/PaymentMethodModal';
import PaymentIcon from '../components/PaymentIcon';
import FiatSelectModal from '../components/modals/FiatSelectModal';
import RegionModal from '../components/RegionModal';
import { NATIVE_ADDRESS } from '../constants';
import { getPaymentMethodIcon } from '../utils';

import { getFiatOnRampAggNavbar } from '../../Navbar';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import Device from '../../../../util/device';
import SkeletonText from '../components/SkeletonText';
import ListItem from '../../../Base/ListItem';
import Box from '../components/Box';
import { NETWORKS_NAMES } from '../../../../constants/on-ramp';
import ErrorView from '../components/ErrorView';
import ErrorViewWithReporting from '../components/ErrorViewWithReporting';

const createStyles = (colors) =>
  StyleSheet.create({
    viewContainer: {
      flex: 1,
    },
    selectors: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    spacer: {
      minWidth: 8,
    },
    row: {
      marginVertical: 5,
    },
    keypadContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingBottom: 50,
      backgroundColor: colors.background.alternative,
    },
    cta: {
      paddingTop: 12,
    },
    flexRow: {
      flexDirection: 'row',
    },
    flagText: {
      marginVertical: 3,
      marginHorizontal: 0,
    },
  });

const AmountToBuy = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [amountFocused, setAmountFocused] = useState(false);
  const [amount, setAmount] = useState('0');
  const [amountNumber, setAmountNumber] = useState(0);
  const [tokens, setTokens] = useState([]);
  const [error, setError] = useState(null);
  const [retryMethod, setRetryMethod] = useState(null);
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

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        { title: strings('fiat_on_ramp_aggregator.amount_to_buy') },
        colors,
      ),
    );
  }, [navigation, colors]);

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
    selectedChainId,
    sdkError,
  } = useFiatOnRampSDK();

  /**
   * SDK methods are called as the parameters change.
   * We get
   * - getCountries -> countries
   * - defaultFiatCurrency -> getDefaultFiatCurrency
   * - getFiatCurrencies -> currencies
   * - getCryptoCurrencies -> sdkCryptoCurrencies
   * - paymentMethods -> getPaymentMethods
   * - currentPaymentMethod -> getCurrentPaymentMethod
   */

  const [
    { data: countries, isFetching: isFetchingCountries, error: errorCountries },
    queryGetCountries,
  ] = useSDKMethod('getCountries');

  const [
    {
      data: defaultFiatCurrency,
      error: errorDefaultFiatCurrency,
      isFetching: isFetchingDefaultFiatCurrency,
    },
    queryDefaultFiatCurrency,
  ] = useSDKMethod('getDefaultFiatCurrency', selectedRegion?.id);

  const [
    {
      data: fiatCurrencies,
      error: errorFiatCurrencies,
      isFetching: isFetchingFiatCurrencies,
    },
    queryGetFiatCurrencies,
  ] = useSDKMethod(
    'getFiatCurrencies',
    selectedRegion?.id,
    selectedPaymentMethodId,
  );

  const [
    {
      data: sdkCryptoCurrencies,
      error: errorSdkCryptoCurrencies,
      isFetching: isFetchingSdkCryptoCurrencies,
    },
    queryGetCryptoCurrencies,
  ] = useSDKMethod(
    'getCryptoCurrencies',
    selectedRegion?.id,
    selectedPaymentMethodId,
    selectedFiatCurrencyId || '',
  );

  const [
    {
      data: paymentMethods,
      error: errorPaymentMethods,
      isFetching: isFetchingPaymentMethods,
    },
    queryGetPaymentMethods,
  ] = useSDKMethod('getPaymentMethods', selectedRegion?.id);

  const [
    {
      data: currentPaymentMethod,
      error: errorCurrentPaymentMethod,
      isFetching: isFetchingCurrentPaymentMethod,
    },
    queryGetPaymentMethod,
  ] = useSDKMethod(
    'getPaymentMethod',
    selectedRegion?.id,
    selectedPaymentMethodId,
  );

  /**
   * * Defaults and validation of selected values
   */

  const filteredPaymentMethods = useMemo(() => {
    if (paymentMethods) {
      return paymentMethods.filter((paymentMethod) =>
        Device.isAndroid() ? !paymentMethod.isApplePay : true,
      );
    }
    return null;
  }, [paymentMethods]);

  /**
   * Temporarily filter crypto currencies to match current chain id
   * TODO: Remove this filter when we go multi chain. Replace `tokens` with `sdkCryptoCurrencies`
   */
  useEffect(() => {
    if (
      !isFetchingSdkCryptoCurrencies &&
      !errorSdkCryptoCurrencies &&
      sdkCryptoCurrencies
    ) {
      const filteredTokens = sdkCryptoCurrencies.filter(
        (token) => Number(token.network?.chainId) === Number(selectedChainId),
      );
      setTokens(filteredTokens);
    }
  }, [
    sdkCryptoCurrencies,
    errorSdkCryptoCurrencies,
    isFetchingSdkCryptoCurrencies,
    selectedChainId,
  ]);

  /**
   * Select the default fiat currency as selected if none is selected.
   */
  useEffect(() => {
    if (
      !isFetchingDefaultFiatCurrency &&
      defaultFiatCurrency &&
      !selectedFiatCurrencyId
    ) {
      setSelectedFiatCurrencyId(defaultFiatCurrency.id);
    }
  }, [
    defaultFiatCurrency,
    isFetchingDefaultFiatCurrency,
    selectedFiatCurrencyId,
    setSelectedFiatCurrencyId,
  ]);

  /**
   * Select the default fiat currency if current selection is not available.
   */
  useEffect(() => {
    if (
      !isFetchingFiatCurrencies &&
      !isFetchingDefaultFiatCurrency &&
      selectedFiatCurrencyId &&
      fiatCurrencies &&
      defaultFiatCurrency &&
      !fiatCurrencies.some((currency) => currency.id === selectedFiatCurrencyId)
    ) {
      setSelectedFiatCurrencyId(defaultFiatCurrency.id);
    }
  }, [
    defaultFiatCurrency,
    fiatCurrencies,
    isFetchingDefaultFiatCurrency,
    isFetchingFiatCurrencies,
    selectedFiatCurrencyId,
    setSelectedFiatCurrencyId,
  ]);

  /**
   * Select the native crytpo currency of first of the list
   * if current selection is not available.
   * This is using the already filtered list of tokens.
   */
  useEffect(() => {
    if (tokens) {
      if (
        !selectedAsset ||
        !tokens.find((token) => token.address === selectedAsset.address)
      ) {
        setSelectedAsset(
          tokens.find((a) => a.address === NATIVE_ADDRESS) || tokens?.[0],
        );
      }
    }
  }, [sdkCryptoCurrencies, selectedAsset, setSelectedAsset, tokens]);

  /**
   * Select the default payment method if current selection is not available.
   */
  useEffect(() => {
    if (
      !isFetchingPaymentMethods &&
      !errorPaymentMethods &&
      filteredPaymentMethods
    ) {
      if (
        !filteredPaymentMethods.some((pm) => pm.id === selectedPaymentMethodId)
      ) {
        setSelectedPaymentMethodId(filteredPaymentMethods?.[0]?.id);
      }
    }
  }, [
    errorPaymentMethods,
    filteredPaymentMethods,
    isFetchingPaymentMethods,
    selectedPaymentMethodId,
    setSelectedPaymentMethodId,
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
    keypadOffset.value = amountFocused ? 40 : keyboardHeight.current + 40;
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

  const handleKeypadChange = useCallback(({ value, valueAsNumber }) => {
    setAmount(`${value}`);
    setAmountNumber(valueAsNumber);
  }, []);

  const handleQuickAmountPress = useCallback((value) => {
    setAmount(`${value}`);
    setAmountNumber(value);
  }, []);

  const onKeypadLayout = useCallback((event) => {
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
    async (region) => {
      hideRegionModal();
      setAmount('0');
      setAmountNumber(0);
      setSelectedRegion(region);
      if (selectedFiatCurrencyId === defaultFiatCurrency?.id) {
        /*
         * Selected fiat currency is default, we will fetch
         * and select new region default fiat currency
         */
        const newRegionCurrency = await queryDefaultFiatCurrency(region.id);
        setSelectedFiatCurrencyId(newRegionCurrency?.id);
      }
    },
    [
      defaultFiatCurrency?.id,
      hideRegionModal,
      queryDefaultFiatCurrency,
      selectedFiatCurrencyId,
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
    (newAsset) => {
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
    (fiatCurrency) => {
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
    (paymentMethodId) => {
      if (paymentMethodId) {
        setAmount('0');
        setAmountNumber(0);
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
    navigation.navigate('GetQuotes', {
      amount: amountNumber,
      asset: selectedAsset,
    });
  }, [amountNumber, navigation, selectedAsset]);

  /**
   * * Derived values
   */

  /**
   * Get the fiat currency object by id
   */
  const currentFiatCurrency = useMemo(() => {
    const currency =
      fiatCurrencies?.find?.(
        (currency) => currency.id === selectedFiatCurrencyId,
      ) || defaultFiatCurrency;
    return currency;
  }, [fiatCurrencies, defaultFiatCurrency, selectedFiatCurrencyId]);

  /**
   * Format the amount for display (iOS only)
   */
  const displayAmount = useMemo(() => {
    if (Device.isIos() && Intl && Intl?.NumberFormat) {
      return amountFocused
        ? amount
        : new Intl.NumberFormat().format(amountNumber);
    }
    return amount;
  }, [amount, amountFocused, amountNumber]);

  const errorInAmountToBuy = useMemo(
    () =>
      errorSdkCryptoCurrencies ||
      errorCurrentPaymentMethod ||
      errorPaymentMethods ||
      errorFiatCurrencies ||
      errorDefaultFiatCurrency ||
      errorCountries,
    [
      errorCountries,
      errorCurrentPaymentMethod,
      errorDefaultFiatCurrency,
      errorFiatCurrencies,
      errorPaymentMethods,
      errorSdkCryptoCurrencies,
    ],
  );

  useEffect(() => {
    if (errorSdkCryptoCurrencies) {
      setRetryMethod(() => queryGetCryptoCurrencies);
    } else if (errorCurrentPaymentMethod) {
      setRetryMethod(() => queryGetPaymentMethod);
    } else if (errorPaymentMethods) {
      setRetryMethod(() => queryGetPaymentMethods);
    } else if (errorFiatCurrencies) {
      setRetryMethod(() => queryGetFiatCurrencies);
    } else if (errorDefaultFiatCurrency) {
      setRetryMethod(() => queryDefaultFiatCurrency);
    } else if (errorCountries) {
      setRetryMethod(() => queryGetCountries);
    }
  }, [
    errorCountries,
    errorCurrentPaymentMethod,
    errorDefaultFiatCurrency,
    errorFiatCurrencies,
    errorPaymentMethods,
    errorSdkCryptoCurrencies,
    queryDefaultFiatCurrency,
    queryGetCountries,
    queryGetCryptoCurrencies,
    queryGetFiatCurrencies,
    queryGetPaymentMethod,
    queryGetPaymentMethods,
  ]);

  useEffect(() => {
    if (errorInAmountToBuy) {
      setError(errorInAmountToBuy);
    }
  }, [errorInAmountToBuy]);

  if (sdkError) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorViewWithReporting description={sdkError} />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (
    isFetchingSdkCryptoCurrencies ||
    isFetchingCurrentPaymentMethod ||
    isFetchingPaymentMethods ||
    isFetchingFiatCurrencies ||
    isFetchingDefaultFiatCurrency ||
    isFetchingCountries
  ) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ScreenLayout.Content>
            <View style={styles.flexRow}>
              <SkeletonText large thick />
              <SkeletonText thick smaller spacingHorizontal />
            </View>
            <SkeletonText thin small spacingTop spacingVertical />
            <Box>
              <ListItem.Content>
                <ListItem.Body>
                  <ListItem.Icon>
                    <SkeletonText />
                  </ListItem.Icon>
                </ListItem.Body>
                <SkeletonText smaller thin />
              </ListItem.Content>
            </Box>
            <SkeletonText spacingTopSmall spacingVertical thin medium />
            <SkeletonText thin smaller spacingVertical />
            <Box>
              <ListItem.Content>
                <ListItem.Body>
                  <SkeletonText small />
                </ListItem.Body>
                <SkeletonText smaller thin />
              </ListItem.Content>
            </Box>
            <SkeletonText spacingTopSmall spacingVertical thin medium />
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView description={error} ctaOnPress={retryMethod} />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <Pressable onPress={handleKeypadDone} style={styles.viewContainer}>
          <ScreenLayout.Content>
            <View style={[styles.selectors, styles.row]}>
              <AccountSelector />
              <View style={styles.spacer} />
              <SelectorButton onPress={handleChangeRegion}>
                <Text reset style={styles.flagText}>
                  {selectedRegion?.emoji}
                </Text>
              </SelectorButton>
            </View>
            <View style={styles.row}>
              <AssetSelectorButton
                label={strings('fiat_on_ramp_aggregator.want_to_buy')}
                icon={
                  <TokenIcon
                    medium
                    icon={selectedAsset?.logo}
                    symbol={selectedAsset?.symbol}
                  />
                }
                assetSymbol={selectedAsset?.symbol}
                assetName={selectedAsset?.name}
                onPress={handleAssetSelectorPress}
              />
            </View>
            <View style={styles.row}>
              <AmountInput
                highlighted={amountFocused}
                label={strings('fiat_on_ramp_aggregator.amount')}
                currencySymbol={currentFiatCurrency?.denomSymbol}
                amount={displayAmount}
                currencyCode={currentFiatCurrency?.symbol}
                onPress={onAmountInputPress}
                onCurrencyPress={handleFiatSelectorPress}
              />
            </View>
          </ScreenLayout.Content>
        </Pressable>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <PaymentMethodSelector
            label={strings('fiat_on_ramp_aggregator.selected_payment_method')}
            icon={
              <PaymentIcon
                iconType={getPaymentMethodIcon(selectedPaymentMethodId)}
                size={20}
                color={colors.icon.default}
              />
            }
            name={currentPaymentMethod?.name}
            onPress={showPaymentMethodsModal}
          />
          <View style={[styles.row, styles.cta]}>
            <StyledButton
              type="confirm"
              onPress={handleGetQuotePress}
              disabled={amountNumber <= 0}
            >
              {strings('fiat_on_ramp_aggregator.get_quotes')}
            </StyledButton>
          </View>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>

      <Animated.View
        style={[styles.keypadContainer, keypadContainerStyle]}
        onLayout={onKeypadLayout}
      >
        <QuickAmounts
          onAmountPress={handleQuickAmountPress}
          amounts={
            currentFiatCurrency?.id === '/currencies/fiat/usd'
              ? [
                  { value: 100, label: '$100' },
                  { value: 200, label: '$200' },
                  { value: 300, label: '$300' },
                  { value: 400, label: '$400' },
                  // eslint-disable-next-line no-mixed-spaces-and-tabs
                ]
              : []
          }
        />
        <Keypad
          value={amount}
          onChange={handleKeypadChange}
          currency={currentFiatCurrency?.symbol}
        />
        <ScreenLayout.Content>
          <StyledButton type="confirm" onPress={handleKeypadDone}>
            {strings('fiat_on_ramp_aggregator.done')}
          </StyledButton>
        </ScreenLayout.Content>
      </Animated.View>
      <TokenSelectModal
        isVisible={isTokenSelectorModalVisible}
        dismiss={toggleTokenSelectorModal}
        title={strings('fiat_on_ramp_aggregator.select_a_cryptocurrency')}
        description={strings(
          'fiat_on_ramp_aggregator.select_a_cryptocurrency_description',
          { network: NETWORKS_NAMES[selectedChainId] },
        )}
        tokens={tokens}
        onItemPress={handleAssetPress}
      />
      <FiatSelectModal
        isVisible={isFiatSelectorModalVisible}
        dismiss={toggleFiatSelectorModal}
        title={strings('fiat_on_ramp_aggregator.select_region_currency')}
        currencies={fiatCurrencies}
        onItemPress={handleCurrencyPress}
      />
      <PaymentMethodModal
        isVisible={isPaymentMethodModalVisible}
        dismiss={hidePaymentMethodModal}
        title={strings('fiat_on_ramp_aggregator.select_payment_method')}
        paymentMethods={filteredPaymentMethods}
        selectedPaymentMethod={selectedPaymentMethodId}
        onItemPress={handleChangePaymentMethod}
      />
      <RegionModal
        isVisible={isRegionModalVisible}
        title={strings('fiat_on_ramp_aggregator.region.title')}
        description={strings('fiat_on_ramp_aggregator.region.description')}
        data={countries}
        dismiss={hideRegionModal}
        onRegionPress={handleRegionPress}
      />
    </ScreenLayout>
  );
};

export default AmountToBuy;
