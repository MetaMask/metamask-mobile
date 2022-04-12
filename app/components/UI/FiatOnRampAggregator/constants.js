import { Icon } from './components/PaymentIcon';

export const CHAIN_ID_NETWORKS = {
	1: 'ethereum',
	10: 'optimism',
	56: 'bsc',
	137: 'polygon',
	200: 'arbitrum xDai',
	42161: 'arbitrum one',
	43114: 'avalanche',
	250: 'fantom',
};

export const PAYMENT_METHOD_ICON = {
	'/payments/debit-credit-card': Icon.Card,
	'/payments/bank-account': Icon.Bank,
	'/payments/apple-pay': Icon.Apple,
};
