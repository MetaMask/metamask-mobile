import { Icon } from './components/PaymentIcon';

export const CHAIN_ID_NETWORKS = {
	1: 'ethereum',
	10: 'optimism',
	56: 'bsc',
	137: 'polygon',
	200: 'arbitrum',
	43114: 'avalanche',
};

export const PAYMENT_METHOD_ICON = {
	'/payments/debit-credit-card': Icon.Card,
	'/payments/bank-account': Icon.Bank,
	'/payments/apple-pay': Icon.Apple,
};
