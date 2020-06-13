import { WYRE_API_ENDPOINT, WYRE_API_ENDPOINT_TEST } from 'react-native-dotenv';
import { useCallback } from 'react';

// {
// 	id: <original provider id> // Orders are identified by (provider, id)
// 	provider: FIAT_PROVIDER,
// 	amount: 0.343
// 	fee: 0.3,
// 	currency: "USD"
// 	state: FIAT_ORDER_STATE
// 	account: <account wallet address>
// 	network: <network>
// 	txHash: <transaction hash | null>
// 	data: <original provider data>
// }

export function processWyreApplePayOrder(order) {
	console.log('processWyreApplePayOrder');

	// Once the transferId is returned it means order was accepted and the transfer (blockchain transaction) is in progress. To track its progress please check the transfer tracking documentation here https://docs.sendwyre.com/v3/docs/track-wallet-order

	return order;
}

export function useWyreTerms(navigation) {
	const handleWyreTerms = useCallback(
		() =>
			navigation.navigate('Webview', {
				url: 'https://www.sendwyre.com/user-agreement/',
				title: 'Wyre User Agreement'
			}),
		[navigation]
	);
	return handleWyreTerms;
}
