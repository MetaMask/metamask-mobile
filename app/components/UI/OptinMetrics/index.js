import React, { Component } from 'react';
import { View } from 'react-native';
import PropTypes from 'prop-types';
import { baseStyles } from '../../../styles/common';
import ActionView from '../../UI/ActionView';
import AsyncStorage from '@react-native-community/async-storage';

/**
 * View that is displayed in the flow to agree terms and conditions
 */
export default class OptinMetrics extends Component {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	onCancel = () => {
		const { navigation } = this.props;
		navigation.navigate('HomeNav');
	};

	onConfirm = async () => {
		const { navigation } = this.props;
		await AsyncStorage.setItem('@MetaMask:metricsAgreed', 'agreed');
		navigation.navigate('HomeNav');
	};

	render() {
		return (
			<View style={baseStyles.flexGrow}>
				<ActionView
					cancelText={'No, Thanks'}
					confirmText={'I Agree'}
					onCancelPress={this.onCancel}
					onConfirmPress={this.onConfirm}
					confirmButtonMode={'confirm'}
				/>
			</View>
		);
	}
}
