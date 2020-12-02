import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import FA5Icon from 'react-native-vector-icons/FontAwesome5';
import { NavigationContext } from 'react-navigation';
import { colors } from '../../../styles/common';

import Engine from '../../../core/Engine';
import Device from '../../../util/Device';
import AppConstants from '../../../core/AppConstants';
import { renderFromTokenMinimalUnit } from '../../../util/number';
import { getFetchParams, getQuotesNavigationsParams, useRatio } from './utils';

import { getSwapsQuotesNavbar } from '../Navbar';
import Text from '../../Base/Text';
import Title from '../../Base/Title';
import ScreenView from '../FiatOrders/components/ScreenView';
import StyledButton from '../StyledButton';
import TokenIcon from './components/TokenIcon';
import QuotesSummary from './components/QuotesSummary';
import { toChecksumAddress } from 'ethereumjs-util';

const POLLING_INTERVAL = AppConstants.SWAPS.POLLING_INTERVAL;

const styles = StyleSheet.create({
	screen: {
		flexGrow: 1,
		justifyContent: 'space-between'
	},
	topBar: {
		alignItems: 'center'
	},
	timerWrapper: {
		backgroundColor: colors.grey000,
		borderRadius: 20,
		marginVertical: 15,
		paddingVertical: 4,
		paddingHorizontal: 15,
		flexDirection: 'row',
		alignItems: 'center'
	},
	timer: {
		fontVariant: ['tabular-nums']
	},
	timerHiglight: {
		color: colors.red
	},
	content: {
		paddingHorizontal: 20,
		alignItems: 'center'
	},
	errorViewContent: {
		flex: 1,
		justifyContent: 'center'
	},
	sourceTokenContainer: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	tokenIcon: {
		marginHorizontal: 5
	},
	arrowDown: {
		color: colors.grey100,
		fontSize: Device.isSmallDevice() ? 22 : 25,
		marginHorizontal: 15,
		marginTop: 4,
		marginBottom: 2
	},
	amount: {
		textAlignVertical: 'center',
		fontSize: Device.isSmallDevice() ? 45 : 60
	},
	exchangeRate: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: Device.isSmallDevice() ? 1 : 1
	},
	bottomSection: {
		marginBottom: 10,
		alignItems: 'stretch',
		paddingHorizontal: 20
	},
	quotesSummary: {
		marginVertical: Device.isSmallDevice() ? 15 : 30
	},
	quotesSummaryHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		flexWrap: 'wrap'
	},
	quotesRow: {
		flexDirection: 'row'
	},
	quotesDescription: {
		flex: 1,
		flexWrap: 'wrap',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginRight: 6
	},
	quotesLegend: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginRight: 2
	},
	linkText: {
		color: colors.blue
	},
	quotesFiatColumn: {
		alignItems: 'flex-end',
		justifyContent: 'center'
	},
	infoIcon: {
		fontSize: 12,
		margin: 3,
		color: colors.blue
	},
	ctaButton: {
		width: '100%'
	}
});

async function resetAndStartPolling(
	contractExchangeRates,
	{ slippage, sourceToken, destinationToken, sourceAmount, fromAddress }
) {
	// TODO destinationToken could be the 0 address for ETH,m also tokens that aren't on the wallet
	const fetchParams = getFetchParams({
		slippage,
		sourceToken,
		destinationToken,
		sourceAmount,
		fromAddress,
		destinationTokenConversionRate: contractExchangeRates[toChecksumAddress(destinationToken.address)] || 0
	});
	const { SwapsController } = Engine.context;
	await SwapsController.stopPollingAndResetState();
	await SwapsController.startFetchAndSetQuotes(fetchParams, fetchParams.metaData);
}

function SwapsQuotesView({
	tokens,
	selectedAddress,
	isInPolling,
	isInFetch,
	quotesLastFetched,
	pollingCyclesLeft,
	topAggId,
	quotes,
	errorKey,
	contractExchangeRates
}) {
	const navigation = useContext(NavigationContext);

	/* Get params from navigation */
	const { sourceTokenAddress, destinationTokenAddress, sourceAmount, slippage } = useMemo(
		() => getQuotesNavigationsParams(navigation),
		[navigation]
	);

	/* Get tokens from the tokens list */
	const sourceToken = tokens?.find(token => token.address?.toLowerCase() === sourceTokenAddress.toLowerCase());
	const destinationToken = tokens?.find(
		token => token.address?.toLowerCase() === destinationTokenAddress.toLowerCase()
	);

	/* Get the selected quote */
	const selectedQuote = useMemo(() => quotes[topAggId], [quotes, topAggId]);

	/* Get the ratio between the assets given the selected quote*/
	const [ratioAsSource, setRatioAsSource] = useState(true);

	const [numerator, denominator] = useMemo(() => {
		const source = { ...sourceToken, amount: selectedQuote?.sourceAmount };
		const destination = { ...destinationToken, amount: selectedQuote?.destinationAmount };

		return ratioAsSource ? [destination, source] : [source, destination];
	}, [destinationToken, ratioAsSource, selectedQuote, sourceToken]);

	const ratio = useRatio(numerator?.amount, numerator?.decimals, denominator?.amount, denominator?.decimals);

	/* State */
	const [firstLoadTime, setFirstLoadTime] = useState(Date.now());
	const [isFirstLoad, setFirstLoad] = useState(true);
	const [remainingTime, setRemainingTime] = useState(POLLING_INTERVAL);

	/* Handlers */
	const handleRetry = useCallback(() => {
		setFirstLoadTime(Date.now());
		setFirstLoad(true);
		resetAndStartPolling(contractExchangeRates, {
			slippage,
			sourceToken,
			destinationToken,
			sourceAmount,
			fromAddress: selectedAddress
		});
	}, [destinationToken, selectedAddress, slippage, sourceAmount, sourceToken, contractExchangeRates]);

	const handleRatioSwitch = () => setRatioAsSource(isSource => !isSource);

	/* Effects */
	useEffect(() => {
		resetAndStartPolling(contractExchangeRates, {
			slippage,
			sourceToken,
			destinationToken,
			sourceAmount,
			fromAddress: selectedAddress
		});
		return () => {
			const { SwapsController } = Engine.context;
			SwapsController.stopPollingAndResetState();
		};
	}, [destinationToken, selectedAddress, slippage, sourceAmount, sourceToken, contractExchangeRates]);

	useEffect(() => {
		if (isFirstLoad) {
			if (firstLoadTime < quotesLastFetched || errorKey) {
				setFirstLoad(false);
			}
		}
	}, [errorKey, firstLoadTime, isFirstLoad, quotesLastFetched]);

	useEffect(() => {
		if (isInFetch) {
			setRemainingTime(POLLING_INTERVAL);
			return;
		}
		const tick = setInterval(() => {
			setRemainingTime(quotesLastFetched + POLLING_INTERVAL - Date.now() + 1000);
		}, 1000);
		return () => {
			clearInterval(tick);
		};
	}, [isInFetch, quotesLastFetched]);

	/* Rendering */

	if (isFirstLoad || (!errorKey && !selectedQuote)) {
		return (
			<ScreenView contentContainerStyle={styles.screen}>
				<View style={[styles.content, styles.errorViewContent]}>
					<ActivityIndicator size="large" />
				</View>
			</ScreenView>
		);
	}

	if (!isInPolling && errorKey) {
		return (
			<ScreenView contentContainerStyle={styles.screen}>
				<View style={[styles.content, styles.errorViewContent]}>
					<Title centered>Error View</Title>
					<Text>{errorKey}</Text>
				</View>
				<View style={styles.bottomSection}>
					<StyledButton type="blue" containerStyle={styles.ctaButton} onPress={handleRetry}>
						Try again
					</StyledButton>
				</View>
			</ScreenView>
		);
	}

	return (
		<ScreenView contentContainerStyle={styles.screen}>
			<View style={styles.topBar}>
				{isInPolling && (
					<View style={styles.timerWrapper}>
						{isInFetch ? (
							<>
								<ActivityIndicator size="small" />
								<Text> Fetching new quotes...</Text>
							</>
						) : (
							<Text primary>
								{pollingCyclesLeft > 0 ? 'New quotes in' : 'Quotes expire in'}{' '}
								<Text
									bold
									primary
									style={[styles.timer, remainingTime < 30000 && styles.timerHiglight]}
								>
									{new Date(remainingTime).toISOString().substr(15, 4)}
								</Text>
							</Text>
						)}
					</View>
				)}
				{!isInPolling && (
					<View style={styles.timerWrapper}>
						<Text>Not in polling</Text>
					</View>
				)}
			</View>

			<View style={styles.content}>
				{selectedQuote && (
					<>
						<View style={styles.sourceTokenContainer}>
							<Text>{renderFromTokenMinimalUnit(selectedQuote.sourceAmount, sourceToken.decimals)}</Text>
							<TokenIcon
								style={styles.tokenIcon}
								icon={sourceToken.iconUrl}
								symbol={sourceToken.symbol}
							/>
							<Text>{sourceToken.symbol}</Text>
						</View>
						<IonicIcon style={styles.arrowDown} name="md-arrow-down" />
						<View style={styles.sourceTokenContainer}>
							<TokenIcon
								style={styles.tokenIcon}
								icon={destinationToken.iconUrl}
								symbol={destinationToken.symbol}
							/>
							<Text>{destinationToken.symbol}</Text>
						</View>
						<Text primary style={styles.amount} numberOfLines={1} adjustsFontSizeToFit allowFontScaling>
							~{renderFromTokenMinimalUnit(selectedQuote.destinationAmount, destinationToken.decimals)}
						</Text>
						<View style={styles.exchangeRate}>
							<Text>
								1 {denominator?.symbol} = {ratio.toFormat(10)} {numerator?.symbol}{' '}
								<FA5Icon name="sync" style={styles.infoIcon} onPress={handleRatioSwitch} />
							</Text>
						</View>
					</>
				)}
			</View>

			<View style={styles.bottomSection}>
				<QuotesSummary style={styles.quotesSummary}>
					<QuotesSummary.Header style={styles.quotesSummaryHeader}>
						<QuotesSummary.HeaderText bold>Saving ~$120.38</QuotesSummary.HeaderText>
						<TouchableOpacity>
							<QuotesSummary.HeaderText small>View details →</QuotesSummary.HeaderText>
						</TouchableOpacity>
					</QuotesSummary.Header>
					<QuotesSummary.Body>
						<View style={styles.quotesRow}>
							<View style={styles.quotesDescription}>
								<View style={styles.quotesLegend}>
									<Text primary bold>
										Estimated gas fee
									</Text>
								</View>
								<Text primary bold>
									0.001303 ETH
								</Text>
							</View>
							<View style={styles.quotesFiatColumn}>
								<Text primary bold>
									$2.33 USD
								</Text>
							</View>
						</View>

						<View style={styles.quotesRow}>
							<View style={styles.quotesDescription}>
								<View style={styles.quotesLegend}>
									<Text>Max gas fee </Text>
									<TouchableOpacity>
										<Text style={styles.linkText}>Edit</Text>
									</TouchableOpacity>
								</View>
								<Text>0.009043 ETH</Text>
							</View>
							<View style={styles.quotesFiatColumn}>
								<Text>$22.33 USD</Text>
							</View>
						</View>

						<QuotesSummary.Separator />
						<View style={styles.quotesRow}>
							<TouchableOpacity style={styles.quotesRow}>
								<Text small>
									Quotes include a 0.875% Metamask fee{' '}
									<FAIcon name="info-circle" style={styles.infoIcon} />
								</Text>
							</TouchableOpacity>
						</View>
					</QuotesSummary.Body>
				</QuotesSummary>
				<StyledButton type="blue" containerStyle={styles.ctaButton} disabled={!isInPolling || isInFetch}>
					Tap to Swap
				</StyledButton>
			</View>
		</ScreenView>
	);
}

SwapsQuotesView.propTypes = {
	tokens: PropTypes.arrayOf(PropTypes.object),
	/**
	 * Map of accounts to information objects including balances
	 */
	// accounts: PropTypes.object,
	/**
	 * A string that represents the selected address
	 */
	selectedAddress: PropTypes.string,
	isInPolling: PropTypes.bool,
	isInFetch: PropTypes.bool,
	quotesLastFetched: PropTypes.number,
	topAggId: PropTypes.string,
	pollingCyclesLeft: PropTypes.number,
	quotes: PropTypes.object,
	errorKey: PropTypes.string,
	/**
	 * Object containing token exchange rates in the format address => exchangeRate
	 */
	contractExchangeRates: PropTypes.object
};

SwapsQuotesView.navigationOptions = ({ navigation }) => getSwapsQuotesNavbar(navigation);

const mapStateToProps = state => ({
	// accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	tokens: state.engine.backgroundState.SwapsController.tokens,
	isInPolling: state.engine.backgroundState.SwapsController.isInPolling,
	isInFetch: state.engine.backgroundState.SwapsController.isInFetch,
	quotesLastFetched: state.engine.backgroundState.SwapsController.quotesLastFetched,
	pollingCyclesLeft: state.engine.backgroundState.SwapsController.pollingCyclesLeft,
	topAggId: state.engine.backgroundState.SwapsController.topAggId,
	quotes: state.engine.backgroundState.SwapsController.quotes,
	errorKey: state.engine.backgroundState.SwapsController.errorKey,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates
});

export default connect(mapStateToProps)(SwapsQuotesView);
