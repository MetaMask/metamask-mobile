import React from 'react';
import PropTypes from 'prop-types';
import TransactionNotification from './TransactionNotification';
import BasicNotification from './BasicNotification';

/**
 * BaseNotification component used to render in-app notifications
 */
export default function Notification(props) {
	const { type } = props;
	switch (type) {
		case 'transaction':
			return <TransactionNotification props={props} />;
		case 'simple':
			return <BasicNotification props={props} />;
	}
}

Notification.propTypes = {
	type: PropTypes.string
};
