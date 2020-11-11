import React, { useCallback, useContext, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { connect } from 'react-redux';
import { NavigationContext } from 'react-navigation';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import handleInput from '../../Base/Keypad/rules/native';
import Device from '../../../util/Device';
import useModalHandler from '../../Base/hooks/useModalHandler';
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

function SwapsAmountView({ tokens }) {
	const navigation = useContext(NavigationContext);
	const initialSource = navigation.getParam('sourceToken', 'ETH');
	const [amount, setAmount] = useState('0');
	const [sourceToken, setSourceToken] = useState(() => tokens.find(token => token.symbol === initialSource));
	const [destinationToken, setDestinationToken] = useState(null);

	const [isSourceModalVisible, toggleSourceModal] = useModalHandler(false);
	const [isDestinationModalVisible, toggleDestinationModal] = useModalHandler(false);

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
					<TokenSelectButton
						onPress={toggleSourceModal}
						icon={sourceToken?.iconUrl}
						symbol={sourceToken?.symbol}
					/>

					<TokenSelectModal
						isVisible={isSourceModalVisible}
						dismiss={toggleSourceModal}
						title="Convert from"
						tokens={tokens}
						onItemPress={handleSourceTokenPress}
						exclude={[destinationToken?.symbol]}
					/>
				</View>
				<View style={styles.amountContainer}>
					<Text style={[styles.amount]} numberOfLines={1} adjustsFontSizeToFit allowFontScaling>
						{amount}
					</Text>
					<Text>100 ETH available to swap.</Text>
				</View>
				<View style={styles.horizontalRuleContainer}>
					<View style={styles.horizontalRule} />
					<IonicIcon style={styles.arrowDown} name="md-arrow-down" />

					<View style={styles.horizontalRule} />
				</View>
				<View style={styles.tokenButtonContainer}>
					<TokenSelectButton
						onPress={toggleDestinationModal}
						icon={destinationToken?.iconUrl}
						symbol={destinationToken?.symbol}
					/>
					<TokenSelectModal
						isVisible={isDestinationModalVisible}
						dismiss={toggleDestinationModal}
						title="Convert to"
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
								Max slippage 1%
							</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.column}>
						<View style={styles.ctaContainer}>
							<StyledButton type="blue" containerStyle={styles.cta}>
								Get quotes
							</StyledButton>
						</View>
					</View>
				</View>
			</View>
		</ScreenView>
	);
}

SwapsAmountView.navigationOptions = ({ navigation }) => getSwapsAmountNavbar(navigation);

const dummyTokens = [
	{
		address: '0x0000000000000000000000000000000000000000',
		symbol: 'ETH',
		decimals: 18
	},
	{
		address: '0x6b175474e89094c44da98b954eedeac495271d0f',
		symbol: 'DAI',
		decimals: 18,
		occurances: 30,
		iconUrl: 'https://cloudflare-ipfs.com/ipfs/QmNYVMm3iC7HEoxfvxsZbRoapdjDHj9EREFac4BPeVphSJ'
	},
	{
		address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
		symbol: 'USDT',
		decimals: 6,
		occurances: 30,
		iconUrl: 'https://cloudflare-ipfs.com/ipfs/QmR3TGmDDdmid99ExTHwPiKro4njZhSidbjcTbSrS5rHnq'
	},
	{
		address: '0x8e870d67f660d95d5be530380d0ec0bd388289e1',
		symbol: 'PAX',
		decimals: 18,
		occurances: 30,
		iconUrl: 'https://cloudflare-ipfs.com/ipfs/QmQTzo6Ecdn54x7NafwegjLetAnno1ATL9Y8M3PcVXGVhR'
	},
	{
		address: '0x0000000000085d4780b73119b644ae5ecd22b376',
		symbol: 'TUSD',
		decimals: 18,
		occurances: 30,
		iconUrl: 'https://cloudflare-ipfs.com/ipfs/QmVwUiFsBG9vcQjk1EF2onVDq5mQEXHroU7Ni5eqUNJ1rW'
	},
	{
		address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
		symbol: 'USDC',
		decimals: 6,
		occurances: 30,
		iconUrl: 'https://cloudflare-ipfs.com/ipfs/QmV4pPzqz3fzAv1tevqCFWQGecKQDDvWRvAR2R5qoqhT9f'
	},
	{
		address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
		symbol: 'WETH',
		decimals: 18,
		occurances: 30,
		iconUrl: 'https://cloudflare-ipfs.com/ipfs/QmR4eRajKjRQxHE2JuR4R4gHRjt1ZQgK6J1GxPziuCQ452'
	},
	{
		address: '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d',
		symbol: 'RENBTC',
		decimals: 8,
		occurances: 14,
		iconUrl: 'https://cloudflare-ipfs.com/ipfs/QmebJ5NshGFbxTJPXKr56pChHygrZtpkFLvtf1EtkpHYMY'
	},
	{
		address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
		symbol: 'WBTC',
		decimals: 8,
		occurances: 14,
		iconUrl: 'https://cloudflare-ipfs.com/ipfs/QmSWYBb4H1kshiyowb4VK1YabmzjTZUJLKcTxqDdjS6W5E'
	},
	{
		address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
		symbol: 'UNI',
		decimals: 18,
		occurances: 12,
		iconUrl: 'https://cloudflare-ipfs.com/ipfs/QmacKydMVDvc6uqKSva9Mfm7ACskU98ofEbdZuru827JYJ'
	}
];
SwapsAmountView.propTypes = {
	tokens: PropTypes.arrayOf(PropTypes.object)
};

const mapStateToProps = state => ({
	tokens: dummyTokens
});

export default connect(mapStateToProps)(SwapsAmountView);
