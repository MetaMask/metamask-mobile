import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { hideTransactionNotification } from '../../../../actions/transactionNotification';
import { connect } from 'react-redux';
import { colors } from '../../../../styles/common';
import BaseNotification from '../BaseNotification';
import Device from '../../../../util/Device';
import Animated, { Easing } from 'react-native-reanimated';
import ElevatedView from 'react-native-elevated-view';

const BROWSER_ROUTE = 'BrowserView';

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
	},
	notificationWrapper: {
		height: 70,
		width: '100%'
	}
});

/**
 * BasicNotification component for notifications with title and description
 */
class BasicNotification extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * Boolean that determines if the modal should be shown
		 */
		isVisible: PropTypes.bool.isRequired,
		/**
		 * Number that determines when it should be autodismissed (in miliseconds)
		 */
		autodismiss: PropTypes.number,
		/**
		 * function that dismisses de modal
		 */
		hideTransactionNotification: PropTypes.func,
		/**
		 * Transaction status
		 */
		status: PropTypes.string
	};

	state = {
		internalIsVisible: true,
		inBrowserView: false
	};

	notificationAnimated = new Animated.Value(100);

	animatedTimingStart = (animatedRef, toValue) => {
		Animated.timing(animatedRef, {
			toValue,
			duration: 500,
			easing: Easing.linear,
			useNativeDriver: true
		}).start();
	};

	componentDidMount = () => {
		this.props.hideTransactionNotification();
		// To get the notificationAnimated ref when component mounts
		setTimeout(() => this.setState({ internalIsVisible: this.props.isVisible }), 100);
	};

	isInBrowserView = () => {
		const currentRouteName = this.findRouteNameFromNavigatorState(this.props.navigation.state);
		return currentRouteName === BROWSER_ROUTE;
	};

	componentDidUpdate = async prevProps => {
		// Check whether current view is browser
		if (this.props.isVisible && prevProps.navigation.state !== this.props.navigation.state) {
			// eslint-disable-next-line react/no-did-update-set-state
			this.setState({ inBrowserView: this.isInBrowserView(prevProps) });
		}
		if (!prevProps.isVisible && this.props.isVisible) {
			// Auto dismiss notification in case of confirmations
			this.props.autodismiss &&
				setTimeout(() => {
					this.props.hideTransactionNotification();
				}, this.props.autodismiss);

			// eslint-disable-next-line react/no-did-update-set-state
			await this.setState({
				internalIsVisible: true,
				inBrowserView: this.isInBrowserView(prevProps)
			});

			setTimeout(() => this.animatedTimingStart(this.notificationAnimated, 0), 100);
		} else if (prevProps.isVisible && !this.props.isVisible) {
			this.animatedTimingStart(this.notificationAnimated, 200);
			// eslint-disable-next-line react/no-did-update-set-state
			setTimeout(
				() =>
					this.setState({
						internalIsVisible: false
					}),
				500
			);
		}
	};

	findRouteNameFromNavigatorState({ routes }) {
		let route = routes[routes.length - 1];
		while (route.index !== undefined) route = route.routes[route.index];
		return route.routeName;
	}

	componentWillUnmount = () => {
		this.props.hideTransactionNotification();
	};

	onClose = () => {
		this.onCloseDetails();
		this.props.hideTransactionNotification();
	};

	render = () => {
		const { status } = this.props;
		const { internalIsVisible, inBrowserView } = this.state;
		if (!internalIsVisible) return null;
		return (
			<ElevatedView
				style={[styles.modalTypeView, inBrowserView ? styles.modalTypeViewBrowser : {}]}
				elevation={100}
			>
				<Animated.View
					style={[styles.notificationContainer, { transform: [{ translateY: this.notificationAnimated }] }]}
				>
					<View style={styles.notificationWrapper}>
						<BaseNotification
							status={status}
							data={{}}
							onPress={this.onNotificationPress}
							onHide={this.onClose}
						/>
					</View>
				</Animated.View>
			</ElevatedView>
		);
	};
}

const mapStateToProps = state => ({
	isVisible: state.transactionNotification.isVisible,
	autodismiss: state.transactionNotification.autodismiss,
	status: state.transactionNotification.status
});

const mapDispatchToProps = dispatch => ({
	hideTransactionNotification: () => dispatch(hideTransactionNotification())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(BasicNotification);
