import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, StyleSheet, View, TouchableOpacity } from 'react-native';
import { connect } from 'react-redux';
import { NavigationContext } from 'react-navigation';
import { View as AnimatableView } from 'react-native-animatable';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import Logger from '../../../util/Logger';
import { toChecksumAddress } from 'ethereumjs-util';
import { balanceToFiat, fromTokenMinimalUnit, toTokenMinimalUnit, weiToFiat } from '../../../util/number';
import { swapsUtils } from '@estebanmino/controllers';

import { swapsTokensWithBalanceSelector, swapsTopAssetsSelector } from '../../../reducers/swaps';
import Engine from '../../../core/Engine';
import AppConstants from '../../../core/AppConstants';
import useModalHandler from '../../Base/hooks/useModalHandler';
import Device from '../../../util/Device';
import { setQuotesNavigationsParams } from './utils';

import { getEtherscanAddressUrl } from '../../../util/etherscan';
import { strings } from '../../../../locales/i18n';
import { colors } from '../../../styles/common';

import { getSwapsAmountNavbar } from '../Navbar';
import Text from '../../Base/Text';
import Keypad from '../../Base/Keypad';
import StyledButton from '../StyledButton';
import ScreenView from '../FiatOrders/components/ScreenView';
import TokenSelectButton from './components/TokenSelectButton';
import TokenSelectModal from './components/TokenSelectModal';
import SlippageModal from './components/SlippageModal';
import useBalance from './utils/useBalance';

const styles = StyleSheet.create({
	screen: {
		flexGrow: 1,
		justifyContent: 'space-between'
	},
	content: {
		flexGrow: 1,
		justifyContent: 'center'
	},
	keypad: {
		flexGrow: 1,
		justifyContent: 'space-around'
	},
	tokenButtonContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		margin: Device.isIphone5() ? 5 : 10
	},
	amountContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		marginHorizontal: 25
	},
	amount: {
		textAlignVertical: 'center',
		fontSize: Device.isIphone5() ? 30 : 40,
		height: Device.isIphone5() ? 40 : 50
	},
	amountInvalid: {
		color: colors.red
	},
	linkText: {
		color: colors.blue
	},
	horizontalRuleContainer: {
		flexDirection: 'row',
		paddingHorizontal: 30,
		marginVertical: Device.isIphone5() ? 5 : 10,
		alignItems: 'center'
	},
	horizontalRule: {
		flex: 1,
		borderBottomWidth: StyleSheet.hairlineWidth,
		height: 1,
		borderBottomColor: colors.grey100
	},
	arrowDown: {
		color: colors.blue,
		fontSize: 25,
		marginHorizontal: 15
	},
	buttonsContainer: {
		marginTop: Device.isIphone5() ? 10 : 30,
		marginBottom: 5,
		paddingHorizontal: 30,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	column: {
		flex: 1
	},
	ctaContainer: {
		flexDirection: 'row',
		justifyContent: 'flex-end'
	},
	cta: {
		paddingHorizontal: Device.isIphone5() ? 10 : 20
	}
});

// Grab this from SwapsController.utils
const SWAPS_ETH_ADDRESS = swapsUtils.ETH_SWAPS_TOKEN_ADDRESS;

function SwapsAmountView({
	tokens,
	accounts,
	selectedAddress,
	balances,
	tokensWithBalance,
	tokensTopAssets,
	conversionRate,
	tokenExchangeRates,
	currentCurrency
}) {
	const navigation = useContext(NavigationContext);
	const initialSource = navigation.getParam('sourceToken', SWAPS_ETH_ADDRESS);
	const [amount, setAmount] = useState('0');
	const [slippage, setSlippage] = useState(AppConstants.SWAPS.DEFAULT_SLIPPAGE);
	const [isInitialLoadingTokens, setInitialLoadingTokens] = useState(false);
	const [, setLoadingTokens] = useState(false);

	const [sourceToken, setSourceToken] = useState(() =>
		tokens?.find(token => token.address?.toLowerCase() === initialSource.toLowerCase())
	);
	const [destinationToken, setDestinationToken] = useState(null);

	const [isSourceModalVisible, toggleSourceModal] = useModalHandler(false);
	const [isDestinationModalVisible, toggleDestinationModal] = useModalHandler(false);
	const [isSlippageModalVisible, toggleSlippageModal] = useModalHandler(false);

	const keypadViewRef = useRef(null);

	useEffect(() => {
		(async () => {
			const { SwapsController } = Engine.context;
			try {
				await SwapsController.fetchAggregatorMetadataWithCache();
				await SwapsController.fetchTopAssetsWithCache();
			} catch (error) {
				Logger.error(error, 'Swaps: Error while updating agg metadata and top assets in amount view');
			}
		})();
	}, []);

	useEffect(() => {
		(async () => {
			const { SwapsController } = Engine.context;
			try {
				if (tokens === null) {
					setInitialLoadingTokens(true);
				}
				setLoadingTokens(true);
				await SwapsController.fetchTokenWithCache();
				setLoadingTokens(false);
				setInitialLoadingTokens(false);
			} catch (error) {
				Logger.error(error, 'Swaps: Error while fetching tokens in amount view');
			} finally {
				setLoadingTokens(false);
				setInitialLoadingTokens(false);
			}
		})();
	}, [tokens]);

	useEffect(() => {
		if (initialSource && tokens && !sourceToken) {
			setSourceToken(tokens.find(token => token.address?.toLowerCase() === initialSource.toLowerCase()));
		}
	}, [tokens, initialSource, sourceToken]);

	const hasInvalidDecimals = useMemo(() => {
		if (sourceToken) {
			return amount?.split('.')[1]?.length > sourceToken.decimals;
		}
		return false;
	}, [amount, sourceToken]);

	const amountAsUnits = useMemo(() => toTokenMinimalUnit(hasInvalidDecimals ? '0' : amount, sourceToken?.decimals), [
		amount,
		hasInvalidDecimals,
		sourceToken
	]);
	const balance = useBalance(accounts, balances, selectedAddress, sourceToken);
	const balanceAsUnits = useBalance(accounts, balances, selectedAddress, sourceToken, { asUnits: true });
	const hasBalance = useMemo(() => {
		if (!balanceAsUnits || !sourceToken) {
			return false;
		}

		return balanceAsUnits.gt(0);
	}, [balanceAsUnits, sourceToken]);

	const hasEnoughBalance = useMemo(() => {
		if (hasInvalidDecimals || !hasBalance || !balanceAsUnits) {
			return false;
		}
		return balanceAsUnits.gte(amountAsUnits);
	}, [amountAsUnits, balanceAsUnits, hasBalance, hasInvalidDecimals]);

	const currencyAmount = useMemo(() => {
		if (!sourceToken || hasInvalidDecimals) {
			return undefined;
		}
		let balanceFiat;
		if (sourceToken.address === SWAPS_ETH_ADDRESS) {
			balanceFiat = weiToFiat(toTokenMinimalUnit(amount, sourceToken?.decimals), conversionRate, currentCurrency);
		} else {
			const sourceAddress = toChecksumAddress(sourceToken.address);
			const exchangeRate = sourceAddress in tokenExchangeRates ? tokenExchangeRates[sourceAddress] : undefined;
			balanceFiat = balanceToFiat(amount, conversionRate, exchangeRate, currentCurrency);
		}
		return balanceFiat;
	}, [amount, conversionRate, currentCurrency, hasInvalidDecimals, sourceToken, tokenExchangeRates]);

	/* Navigation handler */
	const handleGetQuotesPress = useCallback(() => {
		if (hasInvalidDecimals) {
			return;
		}
		return navigation.navigate(
			'SwapsQuotesView',
			setQuotesNavigationsParams(
				sourceToken?.address,
				destinationToken?.address,
				toTokenMinimalUnit(amount, sourceToken?.decimals).toString(),
				slippage
			)
		);
	}, [amount, destinationToken, hasInvalidDecimals, navigation, slippage, sourceToken]);

	/* Keypad Handlers */
	const handleKeypadChange = useCallback(
		value => {
			if (value === amount) {
				return;
			}

			setAmount(value);
		},
		[amount]
	);

	const handleSourceTokenPress = useCallback(
		item => {
			toggleSourceModal();
			setSourceToken(item);
		},
		[toggleSourceModal]
	);

	const handleDestinationTokenPress = useCallback(
		item => {
			toggleDestinationModal();
			setDestinationToken(item);
		},
		[toggleDestinationModal]
	);

	const handleUseMax = useCallback(() => {
		if (!sourceToken || !balanceAsUnits) {
			return;
		}
		setAmount(fromTokenMinimalUnit(balanceAsUnits.toString(), sourceToken.decimals));
	}, [balanceAsUnits, sourceToken]);

	const handleSlippageChange = useCallback(value => {
		setSlippage(value);
	}, []);

	const handleVerifyPress = useCallback(() => {
		if (!destinationToken) {
			return;
		}
		navigation.navigate('Webview', {
			url: getEtherscanAddressUrl('mainnet', destinationToken.address),
			title: strings('swaps.verify')
		});
	}, [destinationToken, navigation]);

	const handleAmountPress = useCallback(() => keypadViewRef?.current?.shake?.(), []);

	return (
		<ScreenView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
			<View style={styles.content}>
				<View style={styles.tokenButtonContainer}>
					{isInitialLoadingTokens ? (
						<ActivityIndicator size="small" />
					) : (
						<TokenSelectButton
							label={strings('swaps.select_a_token')}
							onPress={toggleSourceModal}
							icon={sourceToken?.iconUrl}
							symbol={sourceToken?.symbol}
						/>
					)}

					<TokenSelectModal
						isVisible={isSourceModalVisible}
						dismiss={toggleSourceModal}
						title={strings('swaps.convert_from')}
						tokens={tokens}
						initialTokens={tokensWithBalance}
						onItemPress={handleSourceTokenPress}
						excludeAddresses={[destinationToken?.address]}
					/>
				</View>
				<View style={styles.amountContainer}>
					<TouchableOpacity onPress={handleAmountPress}>
						<Text primary style={styles.amount} numberOfLines={1} adjustsFontSizeToFit allowFontScaling>
							{amount}
						</Text>
					</TouchableOpacity>
					{!!sourceToken &&
						(hasInvalidDecimals || (!amountAsUnits?.isZero() && !hasEnoughBalance) ? (
							<Text style={styles.amountInvalid}>
								{hasInvalidDecimals
									? strings('swaps.allows_up_to_decimals', {
											symbol: sourceToken.symbol,
											decimals: sourceToken.decimals
											// eslint-disable-next-line no-mixed-spaces-and-tabs
									  })
									: strings('swaps.not_enough', { symbol: sourceToken.symbol })}
							</Text>
						) : amountAsUnits?.isZero() ? (
							<Text>
								{!!sourceToken &&
									balance !== null &&
									strings('swaps.available_to_swap', {
										asset: `${balance} ${sourceToken.symbol}`
									})}
								{sourceToken.address !== SWAPS_ETH_ADDRESS && hasBalance && (
									<Text style={styles.linkText} onPress={handleUseMax}>
										{' '}
										{strings('swaps.use_max')}
									</Text>
								)}
							</Text>
						) : (
							<Text upper>{currencyAmount ? `~${currencyAmount}` : ''}</Text>
						))}
				</View>
				<View style={styles.horizontalRuleContainer}>
					<View style={styles.horizontalRule} />
					<IonicIcon style={styles.arrowDown} name="md-arrow-down" />
					<View style={styles.horizontalRule} />
				</View>
				<View style={styles.tokenButtonContainer}>
					{isInitialLoadingTokens ? (
						<ActivityIndicator size="small" />
					) : (
						<TokenSelectButton
							label={strings('swaps.select_a_token')}
							onPress={toggleDestinationModal}
							icon={destinationToken?.iconUrl}
							symbol={destinationToken?.symbol}
						/>
					)}
					<TokenSelectModal
						isVisible={isDestinationModalVisible}
						dismiss={toggleDestinationModal}
						title={strings('swaps.convert_to')}
						tokens={tokens}
						initialTokens={tokensTopAssets.slice(0, 5)}
						onItemPress={handleDestinationTokenPress}
						excludeAddresses={[sourceToken?.address]}
					/>
				</View>
				<View>
					{destinationToken && destinationToken.symbol !== 'ETH' ? (
						<TouchableOpacity onPress={handleVerifyPress}>
							<Text centered>
								{strings('swaps.verify_on')} <Text link>Etherscan</Text>
							</Text>
						</TouchableOpacity>
					) : (
						<Text />
					)}
				</View>
			</View>
			<View style={styles.keypad}>
				<AnimatableView ref={keypadViewRef}>
					<Keypad onChange={handleKeypadChange} value={amount} />
				</AnimatableView>
				<View style={styles.buttonsContainer}>
					<View style={styles.column}>
						<TouchableOpacity onPress={toggleSlippageModal}>
							<Text bold link>
								{strings('swaps.max_slippage_amount', { slippage: `${slippage}%` })}
							</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.column}>
						<View style={styles.ctaContainer}>
							<StyledButton
								type="blue"
								onPress={handleGetQuotesPress}
								containerStyle={styles.cta}
								disabled={
									isInitialLoadingTokens ||
									!sourceToken ||
									!destinationToken ||
									hasInvalidDecimals ||
									amountAsUnits.isZero()
								}
							>
								{strings('swaps.get_quotes')}
							</StyledButton>
						</View>
					</View>
				</View>
			</View>
			<SlippageModal
				isVisible={isSlippageModalVisible}
				dismiss={toggleSlippageModal}
				onChange={handleSlippageChange}
				slippage={slippage}
			/>
		</ScreenView>
	);
}

SwapsAmountView.navigationOptions = ({ navigation }) => getSwapsAmountNavbar(navigation);

SwapsAmountView.propTypes = {
	tokens: PropTypes.arrayOf(PropTypes.object),
	tokensWithBalance: PropTypes.arrayOf(PropTypes.object),
	tokensTopAssets: PropTypes.arrayOf(PropTypes.object),
	/**
	 * Map of accounts to information objects including balances
	 */
	accounts: PropTypes.object,
	/**
	 * A string that represents the selected address
	 */
	selectedAddress: PropTypes.string,
	/**
	 * An object containing token balances for current account and network in the format address => balance
	 */
	balances: PropTypes.object,
	/**
	 * ETH to current currency conversion rate
	 */
	conversionRate: PropTypes.number,
	/**
	 * Currency code of the currently-active currency
	 */
	currentCurrency: PropTypes.string,
	/**
	 * An object containing token exchange rates in the format address => exchangeRate
	 */
	tokenExchangeRates: PropTypes.object
};

const mapStateToProps = state => ({
	tokens: state.engine.backgroundState.SwapsController.tokens,
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	balances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	tokenExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	tokensWithBalance: swapsTokensWithBalanceSelector(state),
	tokensTopAssets: swapsTopAssetsSelector(state)
});

export default connect(mapStateToProps)(SwapsAmountView);
