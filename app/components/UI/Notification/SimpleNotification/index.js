import React from 'react';
import { StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Animated from 'react-native-reanimated';
import { colors } from '../../../../styles/common';
import BaseNotification from './../BaseNotification';
import Device from '../../../../util/Device';
import ElevatedView from 'react-native-elevated-view';

const styles = StyleSheet.create({
	modalTypeView: {
		position: 'absolute',
		bottom: 0,
		paddingBottom: Device.isIphoneX() ? 20 : 10,
		left: 0,
		right: 0,
		backgroundColor: colors.transparent
	},
	modalTypeViewBrowser: {
		bottom: Device.isIphoneX() ? 70 : 60
	},
	notificationContainer: {
		flex: 0.1,
		flexDirection: 'row',
		alignItems: 'flex-end'
	}
});

function SimpleNotification({ isInBrowserView, notificationAnimated, hideCurrentNotification, currentNotification }) {
	return (
		<ElevatedView style={[styles.modalTypeView, isInBrowserView && styles.modalTypeViewBrowser]} elevation={100}>
			<Animated.View
				style={[styles.notificationContainer, { transform: [{ translateY: notificationAnimated }] }]}
			>
				<BaseNotification
					status={currentNotification.status}
					data={{ title: currentNotification.title, description: currentNotification.description }}
					onHide={hideCurrentNotification}
				/>
			</Animated.View>
		</ElevatedView>
	);
}

SimpleNotification.propTypes = {
	isInBrowserView: PropTypes.bool,
	notificationAnimated: PropTypes.object,
	currentNotification: PropTypes.object,
	hideCurrentNotification: PropTypes.func
};

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts
});

export default connect(mapStateToProps)(SimpleNotification);
