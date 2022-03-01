// eslint-disable-next-line import/prefer-default-export
export const CHAIN_ID_NETWORKS = {
	1: 'ethereum',
	10: 'optimism',
	56: 'bsc',
	137: 'polygon',
	200: 'arbitrum',
	43114: 'avalanche',
};

export const PAYMENT_METHOD_ICON = {
	/* eslint-disable import/no-commonjs */
	'/payments/debit-credit-card': require('./components/images/DebitOrCredit.png'),
	'/payments/bank-account': require('./components/images/BankAccount.png'),
	'/payments/apple-pay': require('./components/images/ApplePay.png'),
};
