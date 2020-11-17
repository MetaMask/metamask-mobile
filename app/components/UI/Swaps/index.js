import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, StyleSheet, View, TouchableOpacity } from 'react-native';
import { connect } from 'react-redux';
import { NavigationContext } from 'react-navigation';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import BigNumber from 'bignumber.js';
import { toChecksumAddress } from 'ethereumjs-util';
import Engine from '../../../core/Engine';
import handleInput from '../../Base/Keypad/rules/native';
import useModalHandler from '../../Base/hooks/useModalHandler';
import Device from '../../../util/Device';
import { renderFromTokenMinimalUnit, renderFromWei } from '../../../util/number';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';

import { getSwapsAmountNavbar } from '../Navbar';
import Text from '../../Base/Text';
import Keypad from '../../Base/Keypad';
import StyledButton from '../StyledButton';
import ScreenView from '../FiatOrders/components/ScreenView';
import TokenSelectButton from './components/TokenSelectButton';
import TokenSelectModal from './components/TokenSelectModal';

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
		...fontStyles.light,
		color: colors.black,
		textAlignVertical: 'center',
		fontSize: Device.isIphone5() ? 30 : 40,
		height: Device.isIphone5() ? 40 : 50
	},
	amountInvalid: {
		color: colors.red
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
	disabledSlippage: {
		color: colors.grey300
	},
	ctaContainer: {
		flexDirection: 'row',
		justifyContent: 'flex-end'
	},
	cta: {
		paddingHorizontal: Device.isIphone5() ? 10 : 20
	}
});

function SwapsAmountView({ tokens, accounts, selectedAddress, balances }) {
	const navigation = useContext(NavigationContext);
	const initialSource = navigation.getParam('sourceToken', 'ETH');
	const [amount, setAmount] = useState('0');
	const amountBigNumber = useMemo(() => new BigNumber(amount), [amount]);
	const [isInitialLoadingTokens, setInitialLoadingTokens] = useState(false);
	const [, setLoadingTokens] = useState(false);

	const [sourceToken, setSourceToken] = useState(() => tokens?.find(token => token.symbol === initialSource));
	const [destinationToken, setDestinationToken] = useState(null);

	const [isSourceModalVisible, toggleSourceModal] = useModalHandler(false);
	const [isDestinationModalVisible, toggleDestinationModal] = useModalHandler(false);

	const hasInvalidDecimals = useMemo(() => {
		if (sourceToken) {
			return amount.replace(/(\d+\.\d*[1-9]|\d+\.)(0+$)/g, '$1').split('.')[1]?.length > sourceToken.decimals;
		}
		return false;
	}, [amount, sourceToken]);

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
			} catch (err) {
				console.error(err);
			} finally {
				setLoadingTokens(false);
				setInitialLoadingTokens(false);
			}
		})();
	}, [tokens]);

	useEffect(() => {
		if (initialSource && tokens && !sourceToken) {
			setSourceToken(tokens.find(token => token.symbol === initialSource));
		}
	}, [tokens, initialSource, sourceToken]);

	const balance = useMemo(() => {
		if (!sourceToken) {
			return null;
		}
		if (sourceToken.symbol === 'ETH') {
			return renderFromWei(accounts[selectedAddress] && accounts[selectedAddress].balance);
		}
		const tokenAddress = toChecksumAddress(sourceToken.address);
		return tokenAddress in balances ? renderFromTokenMinimalUnit(balances[tokenAddress], sourceToken.decimals) : 0;
	}, [accounts, balances, selectedAddress, sourceToken]);

	const hasEnoughBalance = useMemo(() => amountBigNumber.lte(new BigNumber(balance)), [amountBigNumber, balance]);

	/* Keypad Handlers */
	const handleKeypadPress = useCallback(
		newInput => {
			const newAmount = handleInput(amount, newInput);
			if (newAmount === amount) {
				return;
			}

			setAmount(newAmount);
		},
		[amount]
	);
	const handleKeypadPress1 = useCallback(() => handleKeypadPress('1'), [handleKeypadPress]);
	const handleKeypadPress2 = useCallback(() => handleKeypadPress('2'), [handleKeypadPress]);
	const handleKeypadPress3 = useCallback(() => handleKeypadPress('3'), [handleKeypadPress]);
	const handleKeypadPress4 = useCallback(() => handleKeypadPress('4'), [handleKeypadPress]);
	const handleKeypadPress5 = useCallback(() => handleKeypadPress('5'), [handleKeypadPress]);
	const handleKeypadPress6 = useCallback(() => handleKeypadPress('6'), [handleKeypadPress]);
	const handleKeypadPress7 = useCallback(() => handleKeypadPress('7'), [handleKeypadPress]);
	const handleKeypadPress8 = useCallback(() => handleKeypadPress('8'), [handleKeypadPress]);
	const handleKeypadPress9 = useCallback(() => handleKeypadPress('9'), [handleKeypadPress]);
	const handleKeypadPress0 = useCallback(() => handleKeypadPress('0'), [handleKeypadPress]);
	const handleKeypadPressPeriod = useCallback(() => handleKeypadPress('PERIOD'), [handleKeypadPress]);
	const handleKeypadPressBack = useCallback(() => handleKeypadPress('BACK'), [handleKeypadPress]);

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
						onItemPress={handleSourceTokenPress}
						exclude={[destinationToken?.symbol]}
					/>
				</View>
				<View style={styles.amountContainer}>
					<Text style={[styles.amount]} numberOfLines={1} adjustsFontSizeToFit allowFontScaling>
						{amount}
					</Text>
					{sourceToken && (hasInvalidDecimals || !hasEnoughBalance) ? (
						<Text style={styles.amountInvalid}>
							{!hasEnoughBalance
								? strings('swaps.not_enough', { symbol: sourceToken.symbol })
								: strings('swaps.allows_up_to_decimals', {
										symbol: sourceToken.symbol,
										decimals: sourceToken.decimals
										// eslint-disable-next-line no-mixed-spaces-and-tabs
								  })}
						</Text>
					) : (
						<Text>
							{sourceToken && balance !== null
								? strings('swaps.available_to_swap', { asset: `${balance} ${sourceToken.symbol}` })
								: ''}
						</Text>
					)}
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
						onItemPress={handleDestinationTokenPress}
						exclude={[sourceToken?.symbol]}
					/>
				</View>
			</View>
			<View style={styles.keypad}>
				<Keypad>
					<Keypad.Row>
						<Keypad.Button onPress={handleKeypadPress1}>1</Keypad.Button>
						<Keypad.Button onPress={handleKeypadPress2}>2</Keypad.Button>
						<Keypad.Button onPress={handleKeypadPress3}>3</Keypad.Button>
					</Keypad.Row>
					<Keypad.Row>
						<Keypad.Button onPress={handleKeypadPress4}>4</Keypad.Button>
						<Keypad.Button onPress={handleKeypadPress5}>5</Keypad.Button>
						<Keypad.Button onPress={handleKeypadPress6}>6</Keypad.Button>
					</Keypad.Row>
					<Keypad.Row>
						<Keypad.Button onPress={handleKeypadPress7}>7</Keypad.Button>
						<Keypad.Button onPress={handleKeypadPress8}>8</Keypad.Button>
						<Keypad.Button onPress={handleKeypadPress9}>9</Keypad.Button>
					</Keypad.Row>
					<Keypad.Row>
						<Keypad.Button onPress={handleKeypadPressPeriod}>.</Keypad.Button>
						<Keypad.Button onPress={handleKeypadPress0}>0</Keypad.Button>
						<Keypad.DeleteButton onPress={handleKeypadPressBack} />
					</Keypad.Row>
				</Keypad>
				<View style={styles.buttonsContainer}>
					<View style={styles.column}>
						<TouchableOpacity disabled>
							<Text bold style={styles.disabledSlippage}>
								{strings('swaps.max_slippage', { slippage: '1%' })}
							</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.column}>
						<View style={styles.ctaContainer}>
							<StyledButton
								type="blue"
								containerStyle={styles.cta}
								disabled={
									isInitialLoadingTokens ||
									!sourceToken ||
									!destinationToken ||
									hasInvalidDecimals ||
									amountBigNumber.eq(0)
								}
							>
								{strings('swaps.get_quotes')}
							</StyledButton>
						</View>
					</View>
				</View>
			</View>
		</ScreenView>
	);
}

SwapsAmountView.navigationOptions = ({ navigation }) => getSwapsAmountNavbar(navigation);

SwapsAmountView.propTypes = {
	tokens: PropTypes.arrayOf(PropTypes.object),
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
	balances: PropTypes.object
};

const mapStateToProps = state => ({
	tokens: state.engine.backgroundState.SwapsController.tokens,
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	balances: state.engine.backgroundState.TokenBalancesController.contractBalances
});

export default connect(mapStateToProps)(SwapsAmountView);
