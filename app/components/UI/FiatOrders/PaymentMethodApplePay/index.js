import React, { useState, useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Image, TouchableOpacity, InteractionManager, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { connect } from 'react-redux';
import NotificationManager from '../../../../core/NotificationManager';
import Device from '../../../../util/device';
import Logger from '../../../../util/Logger';
import { setLockTime } from '../../../../actions/settings';
import I18n, { strings } from '../../../../../locales/i18n';
import { getNotificationDetails } from '..';
import AnalyticsV2 from '../../../../util/analyticsV2';

import {
	useCountryCurrency,
	useWyreOrderQuotation,
	useWyreTerms,
	useWyreRates,
	useWyreApplePay,
	WyreException,
} from '../orderProcessor/wyreApplePay';
import { FIAT_ORDER_PROVIDERS, PAYMENT_CATEGORY, PAYMENT_RAILS } from '../../../../constants/on-ramp';

import ScreenView from '../components/ScreenView';
import { getPaymentMethodApplePayNavbar } from '../../Navbar';
import AccountSelector from '../components/AccountSelector';
import CountrySelector from '../components/CountrySelector';
import Keypad, { KEYS } from '../../../Base/Keypad';
import Text from '../../../Base/Text';
import StyledButton from '../../StyledButton';
import { colors, fontStyles } from '../../../../styles/common';
import { protectWalletModalVisible } from '../../../../actions/user';
import { addFiatOrder, fiatOrdersCountrySelector, setFiatOrdersCountry } from '../../../../reducers/fiatOrders';

//* styles and components  */

const styles = StyleSheet.create({
	screen: {
		flexGrow: 1,
		justifyContent: 'space-between',
	},
	selectors: {
		flexDirection: 'row',
		marginTop: Device.isIphone5() ? 12 : 18,
		marginHorizontal: 25,
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	spacer: {
		minWidth: 8,
	},
	amountContainer: {
		margin: Device.isIphone5() ? 0 : 12,
		padding: Device.isMediumDevice() ? (Device.isIphone5() ? 5 : 10) : 15,
		alignItems: 'center',
		justifyContent: 'center',
	},
	amount: {
		...fontStyles.light,
		color: colors.black,
		fontSize: Device.isIphone5() ? 48 : 48,
		height: Device.isIphone5() ? 50 : 60,
	},
	amountDescription: {
		minHeight: 22,
	},
	amountError: {
		color: colors.red,
	},
	content: {
		flexGrow: 1,
		justifyContent: 'space-around',
	},
	quickAmounts: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
		marginHorizontal: 70,
	},
	quickAmount: {
		borderRadius: 18,
		borderColor: colors.grey200,
		borderWidth: 1,
		paddingVertical: 5,
		paddingHorizontal: 8,
		alignItems: 'center',
		minWidth: 49,
	},
	quickAmountPlaceholder: {
		backgroundColor: colors.grey000,
		borderColor: colors.grey000,
	},
	quickAmountSelected: {
		backgroundColor: colors.blue,
		borderColor: colors.blue,
	},
	quickAmountSelectedText: {
		color: colors.white,
	},
	buttonContainer: {
		paddingBottom: 20,
	},
	applePayButton: {
		backgroundColor: colors.black,
		padding: 10,
		margin: Device.isIphone5() ? 5 : 10,
		marginHorizontal: 25,
		alignItems: 'center',
	},
	applePayButtonText: {
		color: colors.white,
	},
	applePayButtonContentDisabled: {
		opacity: 0.6,
	},
	applePayLogo: {
		marginLeft: 4,
	},
});

/* eslint-disable import/no-commonjs */
const ApplePayLogo = require('../../../../images/ApplePayLogo.png');
const ApplePay = ({ disabled }) => (
	<Image source={ApplePayLogo} style={[styles.applePayLogo, disabled && styles.applePayButtonContentDisabled]} />
);

ApplePay.propTypes = {
	disabled: PropTypes.bool,
};

const QuickAmount = ({ amount, current, currencySymbol, placeholder, ...props }) => {
	if (placeholder) {
		return (
			<View style={[styles.quickAmount, styles.quickAmountPlaceholder]} {...props}>
				<Text> </Text>
			</View>
		);
	}
	const selected = amount === current;
	return (
		<TouchableOpacity style={[styles.quickAmount, selected && styles.quickAmountSelected]} {...props}>
			<Text bold={selected} style={[selected && styles.quickAmountSelectedText]}>
				{currencySymbol}
				{amount}
			</Text>
		</TouchableOpacity>
	);
};

QuickAmount.propTypes = {
	amount: PropTypes.string,
	current: PropTypes.string,
	currencySymbol: PropTypes.string,
	placeholder: PropTypes.bool,
};

//* Constants */
const US = 'US';
const US_QUICK_AMOUNTS = ['50', '100', '250'];
const US_MIN_AMOUNT = 50;
const US_MAX_AMOUNT = 400;
const NON_US_QUICK_AMOUNTS = ['50', '100', '250'];
const NON_US_MIN_AMOUNT = 50;
const NON_US_MAX_AMOUNT = 800;

const hasZeroAsFirstDecimal = /^\d+\.0$/;
const hasZerosAsDecimals = /^\d+\.00$/;
const hasPeriodWithoutDecimal = /^\d+\.$/;

function PaymentMethodApplePay({
	lockTime,
	setLockTime,
	selectedAddress,
	network,
	selectedCountry,
	addOrder,
	setFiatOrdersCountry,
	protectWalletModalVisible,
}) {
	const navigation = useNavigation();
	const [amount, setAmount] = useState('0');
	const {
		symbol: currencySymbol,
		decimalSeparator,
		currency: selectedCurrency,
	} = useCountryCurrency(selectedCountry);
	const amountWithPeriod = useMemo(() => amount.replace(decimalSeparator, '.'), [amount, decimalSeparator]);
	const roundAmount = useMemo(
		() =>
			hasZerosAsDecimals.test(amountWithPeriod) ||
			hasZeroAsFirstDecimal.test(amountWithPeriod) ||
			hasPeriodWithoutDecimal.test(amountWithPeriod)
				? amountWithPeriod.split('.')[0]
				: amountWithPeriod,
		[amountWithPeriod]
	);

	const handleWyreTerms = useWyreTerms(navigation);
	const wyreCurrencies = useMemo(() => [`${selectedCurrency}ETH`, `USD${selectedCurrency}`], [selectedCurrency]);
	const [ratesETH, ratesUSD] = useWyreRates(network, wyreCurrencies);

	const quickAmounts = useMemo(() => {
		if (!ratesUSD || !ratesUSD[selectedCurrency]) {
			return [];
		}
		const quickAmounts = selectedCountry === US ? US_QUICK_AMOUNTS : NON_US_QUICK_AMOUNTS;
		return quickAmounts.map((amount) => String(Math.ceil(amount * ratesUSD[selectedCurrency])));
	}, [ratesUSD, selectedCountry, selectedCurrency]);

	const [minAmount, maxAmount] = useMemo(() => {
		if (!ratesUSD || !ratesUSD[selectedCurrency]) {
			return [US_MIN_AMOUNT, US_MAX_AMOUNT];
		}
		const minMaxAmounts =
			selectedCountry === US ? [US_MIN_AMOUNT, US_MAX_AMOUNT] : [NON_US_MIN_AMOUNT, NON_US_MAX_AMOUNT];
		return minMaxAmounts.map((amount) => String(Math.ceil(amount * ratesUSD[selectedCurrency])));
	}, [ratesUSD, selectedCountry, selectedCurrency]);

	const isUnderMinimum = (amount !== '0' || Number(roundAmount) !== 0) && Number(roundAmount) < minAmount;

	const isOverMaximum = Number(roundAmount) > maxAmount;

	const validAmount = amount !== '0' && !isUnderMinimum && !isOverMaximum;

	const [isLoadingQuotation, quotation] = useWyreOrderQuotation(
		network,
		roundAmount,
		selectedCurrency,
		selectedAddress,
		selectedCountry,
		validAmount,
		1000
	);

	const disabledButton = !validAmount || isLoadingQuotation || !quotation;

	const [pay, ABORTED] = useWyreApplePay(selectedAddress, selectedCurrency, network);
	const handlePressApplePay = useCallback(async () => {
		if (!quotation) {
			return;
		}
		const prevLockTime = lockTime;
		setLockTime(-1);
		try {
			const order = await pay(
				roundAmount,
				quotation.fees[selectedCurrency] + quotation.fees.ETH / quotation.exchangeRate,
				decimalSeparator ? 2 : 0 // TODO: retrieve decimals with useCurrency in the future
			);
			if (order !== ABORTED) {
				if (order) {
					addOrder(order);
					navigation.dangerouslyGetParent()?.pop();
					protectWalletModalVisible();
					InteractionManager.runAfterInteractions(() => {
						NotificationManager.showSimpleNotification(getNotificationDetails(order));
						AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_PURCHASE_SUBMITTED, {
							fiat_amount: { value: order.amount, anonymous: true },
							fiat_currency: { value: order.currency, anonymous: true },
							crypto_currency: { value: order.cryptocurrency, anonymous: true },
							crypto_amount: { value: order.cryptoAmount, anonymous: true },
							fee_in_fiat: { value: order.fee, anonymous: true },
							fee_in_crypto: { value: order.cryptoFee, anonymous: true },
							//TODO(on-ramp): {value: fiat_amount_in_usd: '' anonymous: true},
							order_id: { value: order.id, anonymous: true },
							'on-ramp_provider': { value: FIAT_ORDER_PROVIDERS.WYRE_APPLE_PAY, anonymous: true },
						});
					});
				} else {
					Logger.error('FiatOrders::WyreApplePayProcessor empty order response', order);
				}
			}
		} catch (error) {
			NotificationManager.showSimpleNotification({
				duration: 5000,
				title: strings('fiat_on_ramp.notifications.purchase_failed_title', {
					currency: 'ETH',
				}),
				description: `${error instanceof WyreException ? 'Wyre: ' : ''}${error.message}`,
				status: 'error',
			});
			Logger.error(error, 'FiatOrders::WyreApplePayProcessor Error');
			InteractionManager.runAfterInteractions(() => {
				AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_PURCHASE_SUBMISSION_FAILED, {
					'on-ramp_provider': { value: FIAT_ORDER_PROVIDERS.WYRE_APPLE_PAY, anonymous: true },
					failure_reason: { value: error.message, anonymous: true },
				});
			});
		} finally {
			setLockTime(prevLockTime);
		}
	}, [
		quotation,
		lockTime,
		setLockTime,
		pay,
		roundAmount,
		decimalSeparator,
		selectedCurrency,
		ABORTED,
		addOrder,
		navigation,
		protectWalletModalVisible,
	]);

	const handleQuickAmountPress = useCallback((amount) => setAmount(amount), []);
	const handleKeypadChange = useCallback(
		(value, key) => {
			if (isOverMaximum && ![KEYS.BACK, KEYS.INITIAL].includes(key)) {
				return;
			}
			if (value === amount) {
				return;
			}

			setAmount(value);
		},
		[amount, isOverMaximum]
	);

	const formatCurrency = useCallback(
		(number) =>
			Intl.NumberFormat(I18n.locale, {
				style: 'currency',
				currency: selectedCurrency,
				currencyDisplay: 'symbol',
			}).format(number),
		[selectedCurrency]
	);

	useEffect(() => {
		setAmount('0');
	}, [selectedCurrency]);

	return (
		<ScreenView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
			<View>
				<View style={styles.selectors}>
					<AccountSelector />
					<View style={styles.spacer} />
					<CountrySelector selectedCountry={selectedCountry} setCountry={setFiatOrdersCountry} />
				</View>
				<View style={styles.amountContainer}>
					<Text
						title
						style={[styles.amount, isOverMaximum && styles.amountError]}
						numberOfLines={1}
						adjustsFontSizeToFit
					>
						{currencySymbol}
						{amount}
					</Text>
					<View style={styles.amountDescription}>
						{!(isUnderMinimum || isOverMaximum) &&
							(!isLoadingQuotation && ratesETH && ratesETH?.[selectedCurrency] ? (
								<Text>
									{roundAmount === '0' && `${formatCurrency(ratesETH[selectedCurrency])}  ≈ 1 ETH`}

									{roundAmount !== '0' && (
										<>
											{strings('fiat_on_ramp.wyre_estimated', {
												currency: 'ETH',
												amount: (quotation
													? quotation.destAmount
													: amountWithPeriod * ratesETH.ETH
												).toFixed(5),
											})}
										</>
									)}
								</Text>
							) : (
								/* <Text>{strings('fiat_on_ramp.wyre_loading_rates')}</Text> */
								<ActivityIndicator size="small" />
							))}
						{isUnderMinimum && (
							<Text>
								{strings('fiat_on_ramp.wyre_minimum_deposit', {
									amount: `${currencySymbol || ''}${minAmount}`,
								})}
							</Text>
						)}
						{isOverMaximum && (
							<Text style={styles.amountError}>
								{strings('fiat_on_ramp.wyre_maximum_deposit', {
									amount: `${currencySymbol || ''}${maxAmount}`,
								})}
							</Text>
						)}
					</View>
				</View>
				{quickAmounts.length > 0 ? (
					<View style={styles.quickAmounts}>
						{quickAmounts.map((quickAmount, i) => (
							<QuickAmount
								key={i}
								amount={quickAmount}
								current={roundAmount}
								currencySymbol={currencySymbol}
								// eslint-disable-next-line react/jsx-no-bind
								onPress={() => handleQuickAmountPress(quickAmount)}
							/>
						))}
					</View>
				) : (
					<View style={styles.quickAmounts}>
						<QuickAmount placeholder />
						<QuickAmount placeholder />
						<QuickAmount placeholder />
					</View>
				)}
			</View>
			<View style={styles.content}>
				<Keypad currency={selectedCurrency} onChange={handleKeypadChange} value={amount} />
				<View style={styles.buttonContainer}>
					<StyledButton
						type="blue"
						disabled={disabledButton}
						containerStyle={styles.applePayButton}
						onPress={handlePressApplePay}
					>
						<Text
							centered
							bold
							style={[styles.applePayButtonText, disabledButton && styles.applePayButtonContentDisabled]}
						>
							{strings('fiat_on_ramp.buy_with')}
						</Text>
						<ApplePay disabled={disabledButton} />
					</StyledButton>
					<Text centered>
						{disabledButton ? (
							<Text>
								<Text bold>
									{strings(
										selectedCountry === 'US'
											? 'fiat_on_ramp.wyre_fees_us_fee'
											: 'fiat_on_ramp.wyre_fees_outside_us_fee'
									)}
								</Text>
							</Text>
						) : (
							<Text>
								<Text bold>
									{strings('fiat_on_ramp.plus_fee', {
										fee: formatCurrency(
											quotation.fees[selectedCurrency] +
												quotation.fees.ETH / quotation.exchangeRate
										),
									})}
								</Text>
							</Text>
						)}
					</Text>
					<TouchableOpacity onPress={handleWyreTerms}>
						<Text centered link>
							{strings('fiat_on_ramp.wyre_terms_of_service')}
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</ScreenView>
	);
}

PaymentMethodApplePay.propTypes = {
	/**
	 * Current time to lock screen set in settings
	 */
	lockTime: PropTypes.number.isRequired,
	/**
	 * Function to change lock screen time setting
	 */
	setLockTime: PropTypes.func.isRequired,
	/**
	 * Currently selected wallet address
	 */
	selectedAddress: PropTypes.string.isRequired,
	/**
	 * Currently selected network
	 */
	network: PropTypes.string.isRequired,
	/**
	 * Currently selected country
	 */
	selectedCountry: PropTypes.string.isRequired,
	/**
	 * Function to dispatch setting a fiat order country to the state
	 */
	setFiatOrdersCountry: PropTypes.func.isRequired,
	/**
	 * Function to dispatch adding a new fiat order to the state
	 */
	addOrder: PropTypes.func.isRequired,
	/**
	 * Prompts protect wallet modal
	 */
	protectWalletModalVisible: PropTypes.func,
};

PaymentMethodApplePay.navigationOptions = ({ navigation }) =>
	getPaymentMethodApplePayNavbar(
		navigation,
		() => {
			InteractionManager.runAfterInteractions(() => {
				AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_PURCHASE_EXITED, {
					payment_rails: PAYMENT_RAILS.APPLE_PAY,
					payment_category: PAYMENT_CATEGORY.CARD_PAYMENT,
					'on-ramp_provider': FIAT_ORDER_PROVIDERS.WYRE_APPLE_PAY,
				});
			});
		},
		() => {
			InteractionManager.runAfterInteractions(() => {
				AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_CLOSED);
			});
		}
	);

const mapStateToProps = (state) => ({
	lockTime: state.settings.lockTime,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	network: state.engine.backgroundState.NetworkController.network,
	selectedCountry: fiatOrdersCountrySelector(state),
});

const mapDispatchToProps = (dispatch) => ({
	setLockTime: (time) => dispatch(setLockTime(time)),
	addOrder: (order) => dispatch(addFiatOrder(order)),
	setFiatOrdersCountry: (countryCode) => dispatch(setFiatOrdersCountry(countryCode)),
	protectWalletModalVisible: () => dispatch(protectWalletModalVisible()),
});
export default connect(mapStateToProps, mapDispatchToProps)(PaymentMethodApplePay);
