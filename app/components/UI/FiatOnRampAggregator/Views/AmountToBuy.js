import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import StyledButton from '../../StyledButton';
import { strings } from '../../../../../locales/i18n';
import useModalHandler from '../../../Base/hooks/useModalHandler';
import TokenSelectModal from '../components/TokenSelectModal';
import { useFiatOnRampSDK } from '../SDK';

import ScreenLayout from '../components/ScreenLayout';
import Text from '../../../Base/Text';
import AssetSelectorButton from '../components/AssetSelectorButton';
import AmountInput from '../components/AmountInput';
import Keypad from '../components/Keypad';
import Box from '../components/Box';
import QuickAmounts from '../components/QuickAmounts';
import SelectorButton from '../../../Base/SelectorButton';
import AccountSelector from '../components/AccountSelector';
import TokenIcon from '../../Swaps/components/TokenIcon';

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
});

const AmountToBuy = ({ navigation }) => {
	const [amountFocused, setAmountFocused] = useState(false);
	const [amount, setAmount] = useState('0');
	const [tokens, setTokens] = useState([]);
	const keyboardHeight = useRef(1000);
	const keypadOffset = useSharedValue(1000);
	const [isTokenSelectorModalVisible, toggleTokenSelectorModal, , hideTokenSelectorModal] = useModalHandler(false);
	const { sdk, selectedCountry, setSelectedCountry, selectedAsset, setSelectedAsset } = useFiatOnRampSDK();

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

	const handleCountryPress = useCallback(() => {
		// TODO: handle
		setSelectedCountry('USA');
	}, [setSelectedCountry]);
	const handleAssetSelectorPress = useCallback(
		(newAmount) => {
			// TODO: handle
			toggleTokenSelectorModal();
		},
		[toggleTokenSelectorModal]
	);
	const handleAmountCurrencyPress = useCallback((newAmount) => {
		// TODO: handle
	}, []);

	const handleAssetPress = useCallback(
		(newAsset) => {
			setSelectedAsset(newAsset);
			hideTokenSelectorModal();
		},
		[hideTokenSelectorModal, setSelectedAsset]
	);

	useEffect(() => {
		keypadOffset.value = amountFocused ? 0 : keyboardHeight.current + 20;
	}, [amountFocused, keyboardHeight, keypadOffset]);

	const displayAmount = useMemo(
		() => (amountFocused ? amount : new Intl.NumberFormat().format(amount)),
		[amount, amountFocused]
	);
	// pre-fetch sdk methods
	useEffect(() => {
		(async () => {
			const tokens = await sdk.getCryptoCurrencies(
				{ countryId: 'US', regionId: 'USA' },
				'/payments/debit-credit-card'
			);
			setTokens(tokens);
		})();
	}, [sdk]);

	return (
		<ScreenLayout>
			<ScreenLayout.Body>
				<Pressable onPress={handleKeypadDone} style={styles.viewContainer}>
					<ScreenLayout.Content>
						<View style={[styles.selectors, styles.row]}>
							<AccountSelector />
							<View style={styles.spacer} />
							<SelectorButton onPress={handleCountryPress}>
								<Text reset>{selectedCountry} - 🇺🇸</Text>
							</SelectorButton>
						</View>
						<View style={styles.row}>
							<AssetSelectorButton
								label={'You want to buy'}
								icon={<TokenIcon medium icon={selectedAsset?.iconUrl} symbol={selectedAsset?.symbol} />}
								assetSymbol={selectedAsset?.symbol}
								assetName={selectedAsset?.name}
								onPress={handleAssetSelectorPress}
							/>
						</View>
						<View style={styles.row}>
							<AmountInput
								highlighted={amountFocused}
								label={'Amount'}
								currencySymbol={'$'}
								amount={displayAmount}
								currencyCode={'USD'}
								onPress={onAmountInputPress}
								onCurrencyPress={handleAmountCurrencyPress}
							/>
						</View>
					</ScreenLayout.Content>
				</Pressable>
			</ScreenLayout.Body>
			<ScreenLayout.Footer>
				<ScreenLayout.Content>
					<View style={styles.row}>
						<Box label="Select payment method">
							<Text>Placeholder</Text>
						</Box>
					</View>
					<View style={styles.row}>
						<StyledButton type="confirm" onPress={() => navigation.navigate('AmountToBuy')}>
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
		</ScreenLayout>
	);
};

AmountToBuy.navigationOptions = ({ navigation, route }) => ({
	title: strings('fiat_on_ramp_aggregator.amount_to_buy'),
});

AmountToBuy.propTypes = {
	navigation: PropTypes.object,
};

export default AmountToBuy;
