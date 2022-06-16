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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useFiatOnRampSDK, useSDKMethod } from '../sdk';

import useModalHandler from '../../../Base/hooks/useModalHandler';
import BaseText from '../../../Base/Text';
import BaseSelectorButton from '../../../Base/SelectorButton';
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
import { getPaymentMethodIcon } from '../utils';

import { getFiatOnRampAggNavbar } from '../../Navbar';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import Device from '../../../../util/device';
import SkeletonText from '../components/SkeletonText';
import BaseListItem from '../../../Base/ListItem';
import Box from '../components/Box';
import { NATIVE_ADDRESS, NETWORKS_NAMES } from '../../../../constants/on-ramp';
import ErrorView from '../components/ErrorView';
import ErrorViewWithReporting from '../components/ErrorViewWithReporting';
import { Colors } from '../../../../util/theme/models';
import { CryptoCurrency } from '@consensys/on-ramp-sdk';
import Routes from '../../../../constants/navigation/Routes';
import useAnalytics from '../hooks/useAnalytics';
import { Region } from '../types';

// TODO: Convert into typescript and correctly type
const Text = BaseText as any;
const ListItem = BaseListItem as any;
const SelectorButton = BaseSelectorButton as any;

const createStyles = (colors: Colors) =>
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
  const { params } = useRoute();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const trackEvent = useAnalytics();
  const [amountFocused, setAmountFocused] = useState(false);
  const [amount, setAmount] = useState('0');
  const [amountNumber, setAmountNumber] = useState(0);
  const [tokens, setTokens] = useState<CryptoCurrency[] | null>(null);
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
   * - limits -> getLimits
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
  ] = useSDKMethod(
    'getDefaultFiatCurrency',
    selectedRegion?.id,
    selectedPaymentMethodId,
  );

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
    selectedFiatCurrencyId,
  );

  const [
    {
      data: paymentMethods,
      error: errorPaymentMethods,
      isFetching: isFetchingPaymentMethods,
    },
    queryGetPaymentMethods,
  ] = useSDKMethod('getPaymentMethods', selectedRegion?.id);

  const [{ data: limits }] = useSDKMethod(
    'getLimits',
    selectedRegion?.id,
    selectedPaymentMethodId,
    selectedAsset?.id,
    selectedFiatCurrencyId,
  );

  /**
   * * Defaults and validation of selected values
   */

  useEffect(() => {
    if (
      selectedRegion &&
      !isFetchingCountries &&
      !errorCountries &&
      countries
    ) {
      const allRegions: Region[] = countries.reduce(
        (acc: Region[], region: Region) => [
          ...acc,
          region,
          ...((region.states as Region[]) || []),
        ],
        [],
      );
      const selectedRegionFromAPI =
        allRegions.find((region) => region.id === selectedRegion.id) ?? null;

      if (!selectedRegionFromAPI || selectedRegionFromAPI.unsupported) {
        navigation.reset({
          routes: [{ name: Routes.FIAT_ON_RAMP_AGGREGATOR.REGION }],
        });
      }
    }
  }, [
    countries,
    errorCountries,
    isFetchingCountries,
    navigation,
    selectedRegion,
  ]);

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
      const foundPaymentMethod = filteredPaymentMethods?.find(
        (pm) => pm.id === selectedPaymentMethodId,
      );
      if (foundPaymentMethod) {
        setSelectedPaymentMethodId(foundPaymentMethod.id);
      } else {
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
   * * Derived values
   */

  const isFetching =
    isFetchingSdkCryptoCurrencies ||
    isFetchingPaymentMethods ||
    isFetchingFiatCurrencies ||
    isFetchingDefaultFiatCurrency ||
    isFetchingCountries;

  /**
   * Get the fiat currency object by id
   */
  const currentFiatCurrency = useMemo(() => {
    const currency =
      fiatCurrencies?.find?.((curr) => curr.id === selectedFiatCurrencyId) ||
      defaultFiatCurrency;
    return currency;
  }, [fiatCurrencies, defaultFiatCurrency, selectedFiatCurrencyId]);

  const currentPaymentMethod = useMemo(
    () =>
      filteredPaymentMethods?.find?.(
        (method) => method.id === selectedPaymentMethodId,
      ),
    [filteredPaymentMethods, selectedPaymentMethodId],
  );

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

  const amountIsBelowMinimum = useMemo(
    () => amountNumber !== 0 && limits && amountNumber < limits.minAmount,
    [amountNumber, limits],
  );

  const amountIsAboveMaximum = useMemo(
    () => amountNumber !== 0 && limits && amountNumber > limits.maxAmount,
    [amountNumber, limits],
  );

  const amountIsValid = useMemo(
    () => !amountIsBelowMinimum && !amountIsAboveMaximum,
    [amountIsBelowMinimum, amountIsAboveMaximum],
  );

  const handleCancelPress = useCallback(() => {
    trackEvent('ONRAMP_CANCELED', {
      location: 'Amount to Buy Screen',
      chain_id_destination: selectedChainId,
    });
  }, [selectedChainId, trackEvent]);

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        {
          title: strings('fiat_on_ramp_aggregator.amount_to_buy'),
          // @ts-expect-error navigation params error
          showBack: params?.showBack,
        },
        colors,
        handleCancelPress,
      ),
    );
    // @ts-expect-error navigation params error
  }, [navigation, colors, handleCancelPress, params?.showBack]);

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
      if (selectedFiatCurrencyId === defaultFiatCurrency?.id) {
        /*
         * Selected fiat currency is default, we will fetch
         * and select new region default fiat currency
         */
        const newRegionCurrency = await queryDefaultFiatCurrency(
          region.id,
          selectedPaymentMethodId,
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
    navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.GET_QUOTES, {
      amount: amountNumber,
      asset: selectedAsset,
      fiatCurrency: currentFiatCurrency,
    });
    trackEvent('ONRAMP_QUOTES_REQUESTED', {
      currency_source: currentFiatCurrency?.symbol as string,
      currency_destination: selectedAsset?.symbol as string,
      payment_method_id: selectedPaymentMethodId as string,
      chain_id_destination: selectedChainId,
      amount: amountNumber,
      location: 'Amount to Buy Screen',
    });
  }, [
    amountNumber,
    currentFiatCurrency,
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

    if (errorSdkCryptoCurrencies) {
      return queryGetCryptoCurrencies();
    } else if (errorPaymentMethods) {
      return queryGetPaymentMethods();
    } else if (errorFiatCurrencies) {
      return queryGetFiatCurrencies();
    } else if (errorDefaultFiatCurrency) {
      return queryDefaultFiatCurrency();
    } else if (errorCountries) {
      return queryGetCountries();
    }
  }, [
    error,
    errorCountries,
    errorDefaultFiatCurrency,
    errorFiatCurrencies,
    errorPaymentMethods,
    errorSdkCryptoCurrencies,
    queryDefaultFiatCurrency,
    queryGetCountries,
    queryGetCryptoCurrencies,
    queryGetFiatCurrencies,
    queryGetPaymentMethods,
  ]);

  useEffect(() => {
    setError(
      (errorSdkCryptoCurrencies ||
        errorPaymentMethods ||
        errorFiatCurrencies ||
        errorDefaultFiatCurrency ||
        errorCountries) ??
        null,
    );
  }, [
    errorCountries,
    errorDefaultFiatCurrency,
    errorFiatCurrencies,
    errorPaymentMethods,
    errorSdkCryptoCurrencies,
  ]);

  if (sdkError) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorViewWithReporting error={sdkError} />
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

  if (!isFetching && tokens && tokens.length === 0) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView
            description={strings(
              'fiat_on_ramp_aggregator.no_tokens_available',
              {
                network: NETWORKS_NAMES[selectedChainId],
                region: selectedRegion?.name,
              },
            )}
            ctaLabel={strings('fiat_on_ramp_aggregator.try_different_region')}
            ctaOnPress={toggleRegionModal as () => void}
          />
        </ScreenLayout.Body>
        <RegionModal
          isVisible={isRegionModalVisible}
          title={strings('fiat_on_ramp_aggregator.region.title')}
          description={strings('fiat_on_ramp_aggregator.region.description')}
          data={countries}
          dismiss={hideRegionModal as () => void}
          onRegionPress={handleRegionPress}
        />
      </ScreenLayout>
    );
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
                assetSymbol={selectedAsset?.symbol ?? ''}
                assetName={selectedAsset?.name ?? ''}
                onPress={handleAssetSelectorPress}
              />
            </View>
            <View style={styles.row}>
              <AmountInput
                highlighted={amountFocused}
                label={strings('fiat_on_ramp_aggregator.amount')}
                currencySymbol={currentFiatCurrency?.denomSymbol}
                amount={displayAmount}
                highlightedError={!amountIsValid}
                currencyCode={currentFiatCurrency?.symbol}
                onPress={onAmountInputPress}
                onCurrencyPress={handleFiatSelectorPress}
              />
            </View>
            {amountIsBelowMinimum && (
              <Text red small>
                {strings('fiat_on_ramp_aggregator.minimum')}{' '}
                {currentFiatCurrency?.denomSymbol}
                {limits?.minAmount}
              </Text>
            )}
            {amountIsAboveMaximum && (
              <Text red small>
                {strings('fiat_on_ramp_aggregator.maximum')}{' '}
                {currentFiatCurrency?.denomSymbol}
                {limits?.maxAmount}
              </Text>
            )}
          </ScreenLayout.Content>
        </Pressable>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <PaymentMethodSelector
            label={strings('fiat_on_ramp_aggregator.update_payment_method')}
            icon={
              <PaymentIcon
                iconType={getPaymentMethodIcon(selectedPaymentMethodId)}
                size={20}
                color={colors.icon.default}
              />
            }
            name={currentPaymentMethod?.name}
            onPress={showPaymentMethodsModal as () => void}
          />
          <View style={[styles.row, styles.cta]}>
            <StyledButton
              type="confirm"
              onPress={handleGetQuotePress}
              disabled={!amountIsValid || amountNumber <= 0}
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
            limits?.quickAmounts?.map((limit) => ({
              value: limit,
              label: currentFiatCurrency?.denomSymbol + limit.toString(),
            })) || []
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
        dismiss={toggleTokenSelectorModal as () => void}
        title={strings('fiat_on_ramp_aggregator.select_a_cryptocurrency')}
        description={strings(
          'fiat_on_ramp_aggregator.select_a_cryptocurrency_description',
          { network: NETWORKS_NAMES[selectedChainId] },
        )}
        tokens={tokens ?? []}
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
        title={strings('fiat_on_ramp_aggregator.select_payment_method')}
        paymentMethods={filteredPaymentMethods}
        selectedPaymentMethodId={selectedPaymentMethodId}
        onItemPress={handleChangePaymentMethod}
        location={'Amount to Buy Screen'}
      />
      <RegionModal
        isVisible={isRegionModalVisible}
        title={strings('fiat_on_ramp_aggregator.region.title')}
        description={strings('fiat_on_ramp_aggregator.region.description')}
        data={countries}
        dismiss={hideRegionModal as () => void}
        onRegionPress={handleRegionPress}
        location={'Amount to Buy Screen'}
      />
    </ScreenLayout>
  );
};

export default AmountToBuy;
