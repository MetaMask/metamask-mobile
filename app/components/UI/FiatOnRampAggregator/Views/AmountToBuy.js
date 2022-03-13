import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import StyledButton from '../../StyledButton';
import { strings } from '../../../../../locales/i18n';
import useModalHandler from '../../../Base/hooks/useModalHandler';
import ScreenLayout from '../components/ScreenLayout';
import Text from '../../../Base/Text';
import AssetSelectorButton from '../components/AssetSelectorButton';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import AmountInput from '../components/AmountInput';
import Keypad from '../components/Keypad';
import QuickAmounts from '../components/QuickAmounts';
import SelectorButton from '../../../Base/SelectorButton';
import AccountSelector from '../components/AccountSelector';
import TokenIcon from '../../Swaps/components/TokenIcon';
// import sdk hooks
import { useFiatOnRampSDK, useSDKMethod } from '../sdk';
// import modals
import TokenSelectModal from '../components/TokenSelectModal';
import PaymentMethodModal from '../components/PaymentMethodModal';
import { PAYMENT_METHOD_ICON } from '../constants';
import WebviewError from '../../WebviewError';
import PaymentIcon from '../components/PaymentIcon';
import FiatSelectModal from '../components/modals/FiatSelectModal';
import RegionModal from '../components/RegionModal';

const styles = StyleSheet.create({
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
	// eslint-disable-next-line react-native/no-color-literals
	keypadContainer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		paddingBottom: 25,
		backgroundColor: '#EDEFF2',
	},
	cta: {
		paddingTop: 12,
	},
});

const formatId = (id) => (id.startsWith('/') ? id : '/' + id);

const AmountToBuy = ({ navigation }) => {
	const [amountFocused, setAmountFocused] = useState(false);
	const [amount, setAmount] = useState('0');
	const [tokens, setTokens] = useState([]);
	const [fiatCurrency, setFiatCurrency] = useState('');
	const [, setShowAlert] = useState(false);
	const keyboardHeight = useRef(1000);
	const keypadOffset = useSharedValue(1000);
	const [isTokenSelectorModalVisible, toggleTokenSelectorModal, , hideTokenSelectorModal] = useModalHandler(false);
	const [isFiatSelectorModalVisible, toggleFiatSelectorModal, , hideFiatSelectorModal] = useModalHandler(false);
	const [isPaymentMethodModalVisible, togglePaymentMethodModal] = useModalHandler(false);
	const [isRegionModalVisible, toggleRegionModal, , hideRegionModal] = useModalHandler(false);

	const {
		selectedCountry,
		selectedRegion,
		selectedAsset,
		setSelectedAsset,
		selectedPaymentMethod,
		setSelectedRegion,
		setSelectedCountry,
	} = useFiatOnRampSDK();

	const [{ data: countries, isFetching: isFetchingCountries, error: errorCountries }, queryGetCountries] =
		useSDKMethod({
			method: 'getCountries',
			onMount: false,
		});

	const [{ data: dataTokens, error: errorDataTokens, isFetching: isFetchingDataTokens }] = useSDKMethod(
		'getCryptoCurrencies',
		{ countryId: selectedCountry?.id, regionId: selectedRegion?.id },
		selectedPaymentMethod
	);

	const [{ data: defaultCurrnecy, error: errorDefaultCurrnecy, isFetching: isFetchingDefaultCurrency }] =
		useSDKMethod('getDefaultFiatCurrency', { countryId: selectedCountry?.id, regionId: selectedRegion?.id });

	const [{ data: currencies, error: errorCurrencies, isFetching: isFetchingCurrencies }] = useSDKMethod(
		'getFiatCurrencies',
		{ countryId: selectedCountry?.id, regionId: selectedRegion?.id },
		selectedPaymentMethod
	);

	const currentCurrency = useMemo(() => {
		// whenever user will switch fiat currnecy, we lookup the new selected currency in the fiat currencies list
		if (currencies && fiatCurrency && fiatCurrency !== formatId(selectedCountry?.currency)) {
			return currencies.find((currency) => currency.id === fiatCurrency);
		}

		if (currencies) {
			return currencies.find((currency) => currency.id === formatId(selectedCountry?.currency));
		}

		return defaultCurrnecy;
	}, [currencies, defaultCurrnecy, fiatCurrency, selectedCountry?.currency]);

	const [{ data: currentPaymentMethod, error: errorGetPaymentMethod, isFetching: isFetchingGetPaymentMethod }] =
		useSDKMethod(
			'getPaymentMethod',
			{ countryId: selectedCountry?.id, regionId: selectedRegion?.id },
			selectedPaymentMethod
		);

	const keypadContainerStyle = useAnimatedStyle(() => ({
		transform: [
			{
				translateY: withTiming(keypadOffset.value),
			},
		],
	}));

	const handleKeypadDone = useCallback(() => {
		setAmountFocused(false);
	}, []);

	const onAmountInputPress = useCallback(() => {
		setAmountFocused(true);
	}, []);

	const handleKeypadChange = useCallback((newAmount) => {
		setAmount(`${newAmount}`);
	}, []);

	const onKeypadLayout = useCallback((event) => {
		const { height } = event.nativeEvent.layout;
		keyboardHeight.current = height;
	}, []);

	/****************** COUNTRY/REGION HANDLERS ****************************/
	const handleChangeCountry = useCallback(() => {
		queryGetCountries();
		toggleRegionModal();
	}, [queryGetCountries, toggleRegionModal]);

	const handleCountryPress = useCallback(
		(country) => {
			if (country.unsupported) {
				setShowAlert(true);
			} else {
				setSelectedCountry(country);
				hideRegionModal();
			}
		},
		[hideRegionModal, setSelectedCountry]
	);

	const handleRegionPress = useCallback(
		(region, country) => {
			if (region.unsupported) {
				setShowAlert(true);
			} else {
				setSelectedRegion(region);
				setSelectedCountry(country);
				hideRegionModal();
			}
		},
		[hideRegionModal, setSelectedCountry, setSelectedRegion]
	);

	const handleUnsetRegion = useCallback(() => {
		setSelectedRegion(undefined);
	}, [setSelectedRegion]);

	/****************** TOKENS HANDLERS *********************************/
	const handleAssetSelectorPress = useCallback(() => {
		toggleTokenSelectorModal();
	}, [toggleTokenSelectorModal]);

	const handleAssetPress = useCallback(
		(newAsset) => {
			setSelectedAsset(newAsset);
			hideTokenSelectorModal();
		},
		[hideTokenSelectorModal, setSelectedAsset]
	);

	/****************** FIAT CURRENCIES HANDLERS *********************************/
	const handleFiatSelectorPress = useCallback(() => {
		toggleFiatSelectorModal();
	}, [toggleFiatSelectorModal]);

	const handleCurrencyPress = useCallback(
		(newCurrency) => {
			setFiatCurrency(newCurrency?.id);
			hideFiatSelectorModal();
		},
		[hideFiatSelectorModal]
	);

	/****************** PAYMENT METHODS HANDLERS *********************************/
	const handlePaymentMethodSelectorPress = useCallback(() => {
		// TODO: handle
		togglePaymentMethodModal();
	}, [togglePaymentMethodModal]);

	const handleGetQuotePress = useCallback(() => {
		navigation.navigate('GetQuotes', { amount });
	}, [amount, navigation]);

	useEffect(() => {
		keypadOffset.value = amountFocused ? 0 : keyboardHeight.current + 20;
	}, [amountFocused, keyboardHeight, keypadOffset]);

	const displayAmount = useMemo(
		() => (amountFocused ? amount : new Intl.NumberFormat().format(amount)),
		[amount, amountFocused]
	);

	// side effect to load available crypto assets to purchase using SDK method: getCryptoCurrencies
	useEffect(() => {
		if (!isFetchingDataTokens && !errorDataTokens && dataTokens) {
			setTokens(dataTokens);
			setSelectedAsset(
				dataTokens.some((a) => a.symbol === 'ETH') ? dataTokens.find((a) => a.symbol === 'ETH') : dataTokens[0]
			);
		}
	}, [errorDataTokens, isFetchingDataTokens, dataTokens, setSelectedAsset]);

	if (
		isFetchingDataTokens ||
		isFetchingGetPaymentMethod ||
		isFetchingCurrencies ||
		isFetchingDefaultCurrency ||
		isFetchingCountries
	) {
		return (
			<ScreenLayout>
				<ScreenLayout.Body>
					<Text>Loading...</Text>
				</ScreenLayout.Body>
			</ScreenLayout>
		);
	}

	if (errorDataTokens || errorGetPaymentMethod || errorCurrencies || errorDefaultCurrnecy || errorCountries) {
		return (
			<WebviewError
				error={{ description: errorDataTokens || errorGetPaymentMethod }}
				onReload={() => navigation.navigate('AmountToBuy')}
			/>
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
							<SelectorButton onPress={handleChangeCountry}>
								<Text reset>{selectedCountry?.emoji}</Text>
							</SelectorButton>
						</View>
						<View style={styles.row}>
							<AssetSelectorButton
								label={'You want to buy'}
								icon={<TokenIcon medium icon={selectedAsset?.logo} symbol={selectedAsset?.symbol} />}
								assetSymbol={selectedAsset?.symbol}
								assetName={selectedAsset?.symbol}
								onPress={handleAssetSelectorPress}
							/>
						</View>
						<View style={styles.row}>
							<AmountInput
								highlighted={amountFocused}
								label={'Amount'}
								currencySymbol={currentCurrency?.denomSymbol}
								amount={displayAmount}
								currencyCode={currentCurrency?.symbol}
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
						id={'/payments/debit-credit-card'}
						icon={<PaymentIcon iconType={PAYMENT_METHOD_ICON[selectedPaymentMethod]} size={20} />}
						name={currentPaymentMethod?.name}
						onPress={handlePaymentMethodSelectorPress}
					/>
					<View style={[styles.row, styles.cta]}>
						<StyledButton
							type="confirm"
							onPress={handleGetQuotePress}
							disabled={Number(amount) <= 0 || currentPaymentMethod?.id !== '/payments/debit-credit-card'}
						>
							Get Quotes
						</StyledButton>
					</View>
				</ScreenLayout.Content>
			</ScreenLayout.Footer>

			<Animated.View style={[styles.keypadContainer, keypadContainerStyle]} onLayout={onKeypadLayout}>
				<QuickAmounts
					onAmountPress={handleKeypadChange}
					amounts={[
						{ value: 100, label: '$100' },
						{ value: 200, label: '$200' },
						{ value: 300, label: '$300' },
						{ value: 400, label: '$400' },
					]}
				/>
				<Keypad value={amount} onChange={handleKeypadChange} currency={'USD'} />
				<ScreenLayout.Content>
					<StyledButton type="confirm" onPress={handleKeypadDone}>
						Done
					</StyledButton>
				</ScreenLayout.Content>
			</Animated.View>
			<TokenSelectModal
				isVisible={isTokenSelectorModalVisible}
				dismiss={toggleTokenSelectorModal}
				title={strings('fiat_on_ramp_aggregator.select_a_cryptocurrency')}
				description={strings('fiat_on_ramp_aggregator.select_a_cryptocurrency_description')}
				tokens={tokens}
				onItemPress={handleAssetPress}
			/>
			<FiatSelectModal
				isVisible={isFiatSelectorModalVisible}
				dismiss={toggleFiatSelectorModal}
				title={strings('fiat_on_ramp_aggregator.select_region_currency')}
				currencies={currencies}
				onItemPress={handleCurrencyPress}
			/>
			<PaymentMethodModal
				isVisible={isPaymentMethodModalVisible}
				dismiss={togglePaymentMethodModal}
				title={strings('fiat_on_ramp_aggregator.select_payment_method')}
			/>
			<RegionModal
				isVisible={isRegionModalVisible}
				title={strings('fiat_on_ramp_aggregator.region.title')}
				description={strings('fiat_on_ramp_aggregator.region.description')}
				data={countries}
				dismiss={hideRegionModal}
				onCountryPress={handleCountryPress}
				onRegionPress={handleRegionPress}
				unsetRegion={handleUnsetRegion}
			/>
		</ScreenLayout>
	);
};

AmountToBuy.navigationOptions = () => ({
	title: strings('fiat_on_ramp_aggregator.amount_to_buy'),
});

AmountToBuy.propTypes = {
	navigation: PropTypes.object,
};

export default AmountToBuy;
