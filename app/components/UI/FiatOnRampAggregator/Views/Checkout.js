import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { baseStyles } from '../../../../styles/common';
import { useTheme } from '../../../../util/theme';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import { allowedCallbackBaseUrls } from '../orderProcessor';
import { useFiatOnRampSDK } from '../sdk';
import WebviewError from '../../WebviewError';
import { FIAT_ORDER_PROVIDERS, NETWORK_ALLOWED_TOKENS, NETWORK_NATIVE_SYMBOL } from '../../../../constants/on-ramp';
import { addFiatOrder } from '../../../../reducers/fiatOrders';
import Engine from '../../../../core/Engine';
import { toLowerCaseEquals } from '../../../../util/general';
import { protectWalletModalVisible } from '../../../../actions/user';

const CheckoutWebView = () => {
	const { sdk, selectedAddress, selectedChainId } = useFiatOnRampSDK();
	const dispatch = useDispatch();
	const [error, setError] = useState('');
	const [key, setKey] = useState(0);
	const navigation = useNavigation();
	const { params } = useRoute();
	const { colors } = useTheme();
	const uri = params?.buyURL;
	useEffect(() => {
		navigation.setOptions(getFiatOnRampAggNavbar(navigation, { title: 'Checkout' }, colors));
	}, [navigation, colors]);

	// util methods
	const transformOrder = (order) => ({
		...order,
		provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
		amount: order.fiatAmount,
		fee: order.totalFeesFiat,
		currency: order.fiatCurrency?.symbol,
		cryptoCurrency: order.cryptoCurrency?.symbol,
		providerInfo: order.provider,
		state: order.status,
		account: order.walletAddress,
		data: order,
	});

	const addTokenToTokensController = async (symbol, chainId) => {
		const { TokensController } = Engine.context;
		if (NETWORK_NATIVE_SYMBOL[chainId] !== symbol) {
			const newToken = (NETWORK_ALLOWED_TOKENS[chainId] || []).find(
				({ symbol: tokenSymbol }) => symbol === tokenSymbol
			);
			if (
				newToken &&
				!TokensController.state.tokens.includes((token) => toLowerCaseEquals(token.address, newToken.address))
			) {
				const { address, symbol, decimals } = newToken;
				await TokensController.addToken(address, symbol, decimals);
			}
		}
	};

	const handleDispatchOrder = useCallback(
		(order) => {
			dispatch(addFiatOrder(order));
		},
		[dispatch]
	);

	const handleDispatchUserWalletProtection = useCallback(() => {
		dispatch(protectWalletModalVisible());
	}, [dispatch]);

	const handleNavigationStateChange = async (navState) => {
		if (allowedCallbackBaseUrls.some((callbackBaseUrl) => navState?.url.startsWith(callbackBaseUrl))) {
			try {
				const orderId = await sdk.getOrderIdFromCallback(params?.providerId, navState?.url);
				const order = await sdk.getOrder(orderId, selectedAddress);
				const transformedOrder = transformOrder(order);
				// add the order to the redux global store
				handleDispatchOrder(transformedOrder);
				// register the token automatically
				await addTokenToTokensController(transformOrder?.cryptoCurrency, selectedChainId);
				// prompt user to protect his/her wallet
				handleDispatchUserWalletProtection();
				// close the checkout webview
				navigation.dangerouslyGetParent()?.pop();
			} catch (error) {
				setError(error?.message);
			}
		}
	};

	if (error) {
		return (
			<WebviewError
				error={{ description: error }}
				onReload={() => {
					setKey((key) => key + 1);
					setError('');
				}}
			/>
		);
	}

	if (uri) {
		return (
			<View style={baseStyles.flexGrow}>
				<WebView
					key={key}
					source={{ uri }}
					allowInlineMediaPlayback
					mediaPlaybackRequiresUserAction={false}
					onNavigationStateChange={handleNavigationStateChange}
				/>
			</View>
		);
	}
};

CheckoutWebView.navigationOptions = ({ route }) => ({
	title: route?.params?.providerName,
});

export default CheckoutWebView;
