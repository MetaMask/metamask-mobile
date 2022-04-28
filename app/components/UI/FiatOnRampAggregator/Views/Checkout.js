import React, { useCallback, useEffect, useState } from 'react';
import qs from 'query-string';
import { useDispatch } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { baseStyles } from '../../../../styles/common';
import { useTheme } from '../../../../util/theme';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import { useFiatOnRampSDK, SDK } from '../sdk';
import WebviewError from '../../WebviewError';
import { NETWORK_NATIVE_SYMBOL } from '../../../../constants/on-ramp';
import { addFiatOrder } from '../../../../reducers/fiatOrders';
import Engine from '../../../../core/Engine';
import { toLowerCaseEquals } from '../../../../util/general';
import { protectWalletModalVisible } from '../../../../actions/user';
import { callbackBaseUrl, processAggregatorOrder, aggregatorInitialFiatOrder } from '../orderProcessor/aggregator';
import NotificationManager from '../../../../core/NotificationManager';
import { getNotificationDetails } from '../../FiatOrders';

const CheckoutWebView = () => {
	const { selectedAddress, selectedChainId } = useFiatOnRampSDK();
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

	const addTokenToTokensController = async (token) => {
		if (!token) return;

		const { address, symbol, decimals, network } = token;
		const chainId = network?.chainId;

		if (Number(chainId) !== Number(selectedChainId) || NETWORK_NATIVE_SYMBOL[chainId] === symbol) {
			return;
		}

		const { TokensController } = Engine.context;

		if (!TokensController.state.tokens.includes((t) => toLowerCaseEquals(t.address, address))) {
			await TokensController.addToken(address, symbol, decimals);
		}
	};

	const handleAddFiatOrder = useCallback(
		(order) => {
			dispatch(addFiatOrder(order));
		},
		[dispatch]
	);

	const handleDispatchUserWalletProtection = useCallback(() => {
		dispatch(protectWalletModalVisible());
	}, [dispatch]);

	const handleNavigationStateChange = async (navState) => {
		if (navState?.url.startsWith(callbackBaseUrl)) {
			try {
				const orders = await SDK.orders();
				const orderId = await orders.getOrderIdFromCallback(params?.provider.id, navState?.url);
				const transformedOrder = await processAggregatorOrder(
					aggregatorInitialFiatOrder({
						id: orderId,
						account: selectedAddress,
						network: Number(selectedChainId),
					})
				);
				// add the order to the redux global store
				handleAddFiatOrder(transformedOrder);
				// register the token automatically
				await addTokenToTokensController(transformedOrder?.data?.cryptoCurrency);
				// prompt user to protect his/her wallet
				handleDispatchUserWalletProtection();
				// close the checkout webview
				navigation.dangerouslyGetParent()?.pop();
				NotificationManager.showSimpleNotification(getNotificationDetails(transformedOrder));
			} catch (error) {
				const parsedUrl = qs.parseUrl(navState?.url);
				if (Object.keys(parsedUrl.query).length === 0) {
					navigation.dangerouslyGetParent()?.pop();
				} else {
					setError(error?.message);
				}
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
					enableApplePay
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
