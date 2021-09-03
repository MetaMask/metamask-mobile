/**
 * @enum {string}
 */
export const FIAT_ORDER_PROVIDERS = {
	WYRE: 'WYRE',
	WYRE_APPLE_PAY: 'WYRE_APPLE_PAY',
	TRANSAK: 'TRANSAK',
};

/**
 * @enum {string}
 */
export const FIAT_ORDER_STATES = {
	PENDING: 'PENDING',
	FAILED: 'FAILED',
	COMPLETED: 'COMPLETED',
	CANCELLED: 'CANCELLED',
};

/**
 * @enum {string}
 */
export const PAYMENT_RAILS = {
	APPLE_PAY: 'Apple Pay',
	MULTIPLE: 'Multiple Options',
};

/**
 * @enum {string}
 */
export const PAYMENT_CATEGORY = {
	CARD_PAYMENT: 'Card Payment',
	BANK_TRANSFER: 'Bank Transfer',
	MULTIPLE: 'Multiple Options',
};
