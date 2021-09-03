import PropTypes from 'prop-types';
import { InteractionManager } from 'react-native';
import { connect } from 'react-redux';
import Device from '../../../util/device';
import AppConstants from '../../../core/AppConstants';
import AnalyticsV2 from '../../../util/analyticsV2';
import NotificationManager from '../../../core/NotificationManager';
import { strings } from '../../../../locales/i18n';
import { renderNumber } from '../../../util/number';

import { FIAT_ORDER_STATES } from '../../../constants/on-ramp';
import { getPendingOrders, updateFiatOrder } from '../../../reducers/fiatOrders';
import useInterval from '../../hooks/useInterval';
import processOrder from './orderProcessor';

/**
 * @typedef {import('../../../reducers/fiatOrders').FiatOrder} FiatOrder
 */

const POLLING_FREQUENCY = AppConstants.FIAT_ORDERS.POLLING_FREQUENCY;
const NOTIFICATION_DURATION = 5000;

export const allowedToBuy = (network) => network === '1' || (network === '42' && Device.isIos());

const baseNotificationDetails = {
	duration: NOTIFICATION_DURATION,
};

/**
 * @param {FiatOrder} fiatOrder
 */
export const getAnalyticsPayload = (fiatOrder) => {
	const payload = {
		fiat_amount: { value: fiatOrder.amount, anonymous: true },
		fiat_currency: { value: fiatOrder.currency, anonymous: true },
		crypto_currency: { value: fiatOrder.cryptocurrency, anonymous: true },
		crypto_amount: { value: fiatOrder.cryptoAmount, anonymous: true },
		fee_in_fiat: { value: fiatOrder.fee, anonymous: true },
		fee_in_crypto: { value: fiatOrder.cryptoFee, anonymous: true },
		order_id: { value: fiatOrder.id, anonymous: true },
		fiat_amount_in_usd: { value: fiatOrder.amountInUSD, anonymous: true },
		'on-ramp_provider': { value: fiatOrder.provider, anonymous: true },
	};
	switch (fiatOrder.state) {
		case FIAT_ORDER_STATES.FAILED: {
			return [AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_PURCHASE_FAILED, payload];
		}
		case FIAT_ORDER_STATES.CANCELLED: {
			return [AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_PURCHASE_CANCELLED, payload];
		}
		case FIAT_ORDER_STATES.COMPLETED: {
			return [AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_PURCHASE_COMPLETED, payload];
		}
		case FIAT_ORDER_STATES.PENDING:
		default: {
			return [null];
		}
	}
};

/**
 * @param {FiatOrder} fiatOrder
 */
export const getNotificationDetails = (fiatOrder) => {
	switch (fiatOrder.state) {
		case FIAT_ORDER_STATES.FAILED: {
			return {
				...baseNotificationDetails,
				title: strings('fiat_on_ramp.notifications.purchase_failed_title', {
					currency: fiatOrder.cryptocurrency,
				}),
				status: 'error',
			};
		}
		case FIAT_ORDER_STATES.CANCELLED: {
			return {
				...baseNotificationDetails,
				title: strings('fiat_on_ramp.notifications.purchase_cancelled_title'),
				status: 'cancelled',
			};
		}
		case FIAT_ORDER_STATES.COMPLETED: {
			return {
				...baseNotificationDetails,
				title: strings('fiat_on_ramp.notifications.purchase_completed_title', {
					amount: renderNumber(String(fiatOrder.cryptoAmount)),
					currency: fiatOrder.cryptocurrency,
				}),
				description: strings('fiat_on_ramp.notifications.purchase_completed_description', {
					currency: fiatOrder.cryptocurrency,
				}),
				status: 'success',
			};
		}
		case FIAT_ORDER_STATES.PENDING:
		default: {
			return {
				...baseNotificationDetails,
				title: strings('fiat_on_ramp.notifications.purchase_pending_title', {
					currency: fiatOrder.cryptocurrency,
				}),
				description: strings('fiat_on_ramp.notifications.purchase_pending_description'),
				status: 'pending',
			};
		}
	}
};

function FiatOrders({ pendingOrders, updateFiatOrder }) {
	useInterval(
		async () => {
			await Promise.all(
				pendingOrders.map(async (order) => {
					const updatedOrder = await processOrder(order);
					updateFiatOrder(updatedOrder);
					if (updatedOrder.state !== order.state) {
						InteractionManager.runAfterInteractions(() => {
							const [analyticsEvent, analyticsPayload] = getAnalyticsPayload(updatedOrder);
							if (analyticsEvent) {
								AnalyticsV2.trackEvent(analyticsEvent, analyticsPayload);
							}
							NotificationManager.showSimpleNotification(getNotificationDetails(updatedOrder));
						});
					}
				})
			);
		},
		pendingOrders.length ? POLLING_FREQUENCY : null
	);

	return null;
}

FiatOrders.propTypes = {
	orders: PropTypes.array,
	selectedAddress: PropTypes.string,
	network: PropTypes.string,
	updateFiatOrder: PropTypes.func,
};

const mapStateToProps = (state) => ({
	pendingOrders: getPendingOrders(state),
});

const mapDispatchToProps = (dispatch) => ({
	updateFiatOrder: (order) => dispatch(updateFiatOrder(order)),
});

export default connect(mapStateToProps, mapDispatchToProps)(FiatOrders);
