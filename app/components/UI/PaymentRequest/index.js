import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Dimensions, StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import PaymentRequestAction from './PaymentRequestAction';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const ACTION_WIDTH = (Dimensions.get('window').width - 60) / 2;

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		minHeight: 450
	},
	actionsWrapper: {
		flex: 1,
		margin: 10
	},
	accountInformation: {},
	row: {
		flexDirection: 'row',
		alignItems: 'center'
	}
});

/**
 * Component that renders scrollable content inside signature request user interface
 */
export default class PaymentRequest extends Component {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	actions = [
		{
			icon: <MaterialIcon name={'share-variant'} size={32} color={colors.black} />,
			title: 'Share Address',
			description: 'Email or text yout address',
			onPress: () => this.props.navigation.navigate('WalletView')
		},
		{
			icon: <FontAwesome name={'qrcode'} size={32} color={colors.black} />,
			title: 'QR Code',
			description: 'Email or text yout address',
			onPress: () => this.props.navigation.navigate('WalletView')
		},
		{
			icon: <MaterialIcon solid name={'hand-pointing-right'} size={32} color={colors.black} />,
			title: 'Request',
			description: 'Email or text yout address',
			onPress: () => this.props.navigation.navigate('WalletView')
		},
		{
			icon: <FontAwesome name={'credit-card'} size={32} color={colors.black} />,
			title: 'Buy',
			description: 'Email or text yout address',
			onPress: () => this.props.navigation.navigate('WalletView')
		}
	];

	render() {
		return (
			<View style={styles.wrapper}>
				<View style={styles.accountInformation}>
					<Text style={fontStyles.normal}>Receive</Text>
				</View>

				<View style={styles.actionsWrapper}>
					<View style={styles.row}>
						<PaymentRequestAction
							style={{ width: ACTION_WIDTH, height: ACTION_WIDTH }}
							icon={this.actions[0].icon}
							actionTitle={this.actions[0].title}
							actionDescription={this.actions[0].description}
							onPress={this.actions[0].onPress}
						/>
						<PaymentRequestAction
							style={{ width: ACTION_WIDTH, height: ACTION_WIDTH }}
							icon={this.actions[1].icon}
							actionTitle={this.actions[1].title}
							actionDescription={this.actions[1].description}
							onPress={this.actions[1].onPress}
						/>
					</View>
					<View style={styles.row}>
						<PaymentRequestAction
							style={{ width: ACTION_WIDTH, height: ACTION_WIDTH }}
							icon={this.actions[2].icon}
							actionTitle={this.actions[2].title}
							actionDescription={this.actions[2].description}
							onPress={this.actions[2].onPress}
						/>
						<PaymentRequestAction
							style={{ width: ACTION_WIDTH, height: ACTION_WIDTH }}
							icon={this.actions[3].icon}
							actionTitle={this.actions[3].title}
							actionDescription={this.actions[3].description}
							onPress={this.actions[2].onPress}
						/>
					</View>
				</View>
			</View>
		);
	}
}
