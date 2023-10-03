import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, View, BackHandler } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useRampSDK } from '../../../common/sdk';
import usePaymentMethods from '../../hooks/usePaymentMethods';
import useRegions from '../../hooks/useRegions';
import useAnalytics from '../../../common/hooks/useAnalytics';
import useModalHandler from '../../../../../Base/hooks/useModalHandler';
import Text from '../../../../../Base/Text';
import BaseListItem from '../../../../../Base/ListItem';
import BaseSelectorButton from '../../../../../Base/SelectorButton';
import StyledButton from '../../../../StyledButton';
import ScreenLayout from '../../../common/components/ScreenLayout';
import Box from '../../../common/components/Box';
import AssetSelectorButton from '../../../common/components/AssetSelectorButton';
import PaymentMethodSelector from '../../../common/components/PaymentMethodSelector';
import AmountInput from '../../../common/components/AmountInput';
import Keypad from '../../../common/components/Keypad';
import QuickAmounts from '../../../common/components/QuickAmounts';
import AccountSelector from '../../../common/components/AccountSelector';
import TokenIcon from '../../../../Swaps/components/TokenIcon';
import CustomActionButton from '../../../common/containers/CustomActionButton';
import TokenSelectModal from '../../../common/components/TokenSelectModal';
import PaymentMethodModal from '../../../common/components/PaymentMethodModal';
import PaymentMethodIcon from '../../../common/components/PaymentMethodIcon';
import FiatSelectModal from '../../../common/components/modals/FiatSelectModal';
import ErrorViewWithReporting from '../../../common/components/ErrorViewWithReporting';
import RegionModal from '../../../common/components/RegionModal';
import SkeletonText from '../../../common/components/SkeletonText';
import ErrorView from '../../../common/components/ErrorView';
import { getFiatOnRampAggNavbar } from '../../../../Navbar';
import { strings } from '../../../../../../../locales/i18n';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { formatAmount } from '../../../common/utils';
import { createQuotesNavDetails } from '../Quotes/Quotes';
import { Region } from '../../../common/types';
import useFiatCurrencies from '../../hooks/useFiatCurrencies';
import useCryptoCurrencies from '../../hooks/useCryptoCurrencies';
import useLimits from '../../hooks/useLimits';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './BuildQuote.styles';

// TODO: Convert into typescript and correctly type
const ListItem = BaseListItem as any;
const SelectorButton = BaseSelectorButton as any;

interface BuildQuoteParams {
  showBack?: boolean;
}

export const createBuildQuoteNavDetails =
  createNavigationDetails<BuildQuoteParams>(Routes.RAMP.BUY.AMOUNT_TO_BUY);

const BuildQuote = () => {
  const navigation = useNavigation();
  const params = useParams<BuildQuoteParams>();
  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, {});
  const trackEvent = useAnalytics();
  const [amountFocused, setAmountFocused] = useState(false);
  const [amount, setAmount] = useState('0');
  const [amountNumber, setAmountNumber] = useState(0);
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
    selectedNetworkName,
    sdkError,
  } = useRampSDK();

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

  const isFetching =
    isFetchingCryptoCurrencies ||
    isFetchingPaymentMethods ||
    isFetchingFiatCurrency ||
    isFetchingRegions;

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
          showBack: params.showBack,
        },
        colors,
        handleCancelPress,
      ),
    );
  }, [navigation, colors, handleCancelPress, params.showBack]);

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
    if (selectedAsset && currentFiatCurrency) {
      navigation.navigate(
        ...createQuotesNavDetails({
          amount: amountNumber,
          asset: selectedAsset,
          fiatCurrency: currentFiatCurrency,
        }),
      );
      trackEvent('ONRAMP_QUOTES_REQUESTED', {
        currency_source: currentFiatCurrency.symbol,
        currency_destination: selectedAsset.symbol,
        payment_method_id: selectedPaymentMethodId as string,
        chain_id_destination: selectedChainId,
        amount: amountNumber,
        location: 'Amount to Buy Screen',
      });
    }
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

  if (sdkError) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorViewWithReporting
            error={sdkError}
            location={'Amount to Buy Screen'}
          />
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
            location={'Amount to Buy Screen'}
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

  if (!isFetching && cryptoCurrencies && cryptoCurrencies.length === 0) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView
            icon="info"
            title={strings('fiat_on_ramp_aggregator.no_tokens_available_title')}
            description={strings(
              'fiat_on_ramp_aggregator.no_tokens_available',
              {
                network:
                  selectedNetworkName ||
                  strings('fiat_on_ramp_aggregator.this_network'),
                region: selectedRegion?.name,
              },
            )}
            ctaLabel={strings('fiat_on_ramp_aggregator.change_payment_method')}
            ctaOnPress={showPaymentMethodsModal as () => void}
            location={'Amount to Buy Screen'}
          />
        </ScreenLayout.Body>
        <PaymentMethodModal
          isVisible={isPaymentMethodModalVisible}
          dismiss={hidePaymentMethodModal as () => void}
          title={strings('fiat_on_ramp_aggregator.select_payment_method')}
          paymentMethods={paymentMethods}
          selectedPaymentMethodId={selectedPaymentMethodId}
          selectedPaymentMethodType={currentPaymentMethod?.paymentType}
          onItemPress={handleChangePaymentMethod}
          selectedRegion={selectedRegion}
          location={'Amount to Buy Screen'}
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
              <SelectorButton
                accessibilityRole="button"
                accessible
                onPress={handleChangeRegion}
              >
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
                amount={amountFocused ? amount : formatAmount(amountNumber)}
                highlightedError={!amountIsValid}
                currencyCode={currentFiatCurrency?.symbol}
                onPress={onAmountInputPress}
                onCurrencyPress={handleFiatSelectorPress}
              />
            </View>
            {amountIsBelowMinimum && limits && (
              <Text red small>
                {strings('fiat_on_ramp_aggregator.minimum')}{' '}
                {currentFiatCurrency?.denomSymbol}
                {formatAmount(limits.minAmount)}
              </Text>
            )}
            {amountIsAboveMaximum && limits && (
              <Text red small>
                {strings('fiat_on_ramp_aggregator.maximum')}{' '}
                {currentFiatCurrency?.denomSymbol}
                {formatAmount(limits.maxAmount)}
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
              <PaymentMethodIcon
                paymentMethodIcons={currentPaymentMethod?.icons}
                paymentMethodType={currentPaymentMethod?.paymentType}
                size={20}
                color={colors.icon.default}
              />
            }
            name={currentPaymentMethod?.name}
            onPress={showPaymentMethodsModal as () => void}
          />
          <View style={[styles.row, styles.cta]}>
            {currentPaymentMethod?.customAction ? (
              <CustomActionButton
                customAction={currentPaymentMethod.customAction}
                amount={amountNumber}
                disabled={!amountIsValid || amountNumber <= 0}
                fiatSymbol={currentFiatCurrency?.symbol}
              />
            ) : (
              <StyledButton
                type="confirm"
                onPress={handleGetQuotePress}
                accessibilityRole="button"
                accessible
                disabled={amountNumber <= 0}
              >
                {strings('fiat_on_ramp_aggregator.get_quotes')}
              </StyledButton>
            )}
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
          decimals={currentFiatCurrency?.decimals}
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
        title={strings('fiat_on_ramp_aggregator.select_payment_method')}
        paymentMethods={paymentMethods}
        selectedPaymentMethodId={selectedPaymentMethodId}
        selectedPaymentMethodType={currentPaymentMethod?.paymentType}
        onItemPress={handleChangePaymentMethod}
        selectedRegion={selectedRegion}
        location={'Amount to Buy Screen'}
      />
      <RegionModal
        isVisible={isRegionModalVisible}
        title={strings('fiat_on_ramp_aggregator.region.title')}
        description={strings('fiat_on_ramp_aggregator.region.description')}
        data={regions}
        dismiss={hideRegionModal as () => void}
        onRegionPress={handleRegionPress}
        location={'Amount to Buy Screen'}
      />
    </ScreenLayout>
  );
};

export default BuildQuote;
