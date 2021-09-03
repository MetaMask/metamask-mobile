import React from 'react';
import { StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import Animated from 'react-native-reanimated';
import BaseNotification from './../BaseNotification';
import Device from '../../../../util/device';
import ElevatedView from 'react-native-elevated-view';

const styles = StyleSheet.create({
	modalTypeViewBrowser: {
		bottom: Device.isIphoneX() ? 70 : 60,
	},
	notificationContainer: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		paddingBottom: Device.isIphoneX() ? 20 : 10,
	},
});

function SimpleNotification({ isInBrowserView, notificationAnimated, hideCurrentNotification, currentNotification }) {
	return (
		<Animated.View
			style={[
				styles.notificationContainer,
				isInBrowserView && styles.modalTypeViewBrowser,
				{ transform: [{ translateY: notificationAnimated }] },
			]}
		>
			<ElevatedView elevation={100}>
				<BaseNotification
					status={currentNotification.status}
					data={{ title: currentNotification.title, description: currentNotification.description }}
					onHide={hideCurrentNotification}
				/>
			</ElevatedView>
		</Animated.View>
	);
}

SimpleNotification.propTypes = {
	isInBrowserView: PropTypes.bool,
	notificationAnimated: PropTypes.object,
	currentNotification: PropTypes.object,
	hideCurrentNotification: PropTypes.func,
};

export default SimpleNotification;
