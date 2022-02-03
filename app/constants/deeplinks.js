export const ETH_ACTIONS = {
	TRANSFER: 'tranfer',
	APPROVE: 'approve',
};

export const PROTOCOLS = {
	HTTP: 'http',
	HTTPS: 'https',
	WC: 'wc',
	ETHEREUM: 'ethereum',
	DAPP: 'dapp',
	METAMASK: 'metamask',
};

export const ACTIONS = {
	DAPP: 'dapp',
	SEND: 'send',
	APPROVE: 'approve',
	PAYMENT: 'payment',
	FOCUS: 'focus',
	EMPTY: '',
	WC: 'wc',
};

export const PREFIXES = {
	[ACTIONS.DAPP]: 'https://',
	[ACTIONS.SEND]: 'ethereum:',
	[ACTIONS.APPROVE]: 'ethereum:',
	[ACTIONS.FOCUS]: '',
	[ACTIONS.EMPTY]: '',
};
