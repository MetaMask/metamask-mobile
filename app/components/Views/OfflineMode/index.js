'use strict';
import React, { PureComponent } from 'react';
import { SafeAreaView, Image, Text, View, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import StyledButton from '../../UI/StyledButton';
import { getOfflineModalNavbar } from '../../UI/Navbar';
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/Device';

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.white
	},
	innerView: {
		flex: 1
	},
	frame: {
		width: 200,
		height: 200,
		alignSelf: 'center',
		justifyContent: 'center',
		marginTop: 80,
		marginBottom: 10
	},
	content: {
		width: 300,
		height: 125,
		alignSelf: 'center',
		justifyContent: 'center'
	},
	text: {
		flex: 1,
		fontSize: 12,
		color: colors.fontPrimary,
		textAlign: 'center',
		justifyContent: 'center'
	},
	title: {
		fontSize: 17,
		color: colors.fontPrimary,
		textAlign: 'center',
		justifyContent: 'center',
		marginBottom: 10
	},
	button: {
		alignSelf: 'center',
		width: 150,
		height: 50
	}
});

const astronautImage = require('../../../images/astronaut.png'); // eslint-disable-line import/no-commonjs

/**
 * View that wraps the Offline mode screen
 */
export default class OfflineMode extends PureComponent {
	static navigationOptions = ({ navigation }) => getOfflineModalNavbar(navigation);

	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object
	};

	goBack = () => {
		this.props.navigation.goBack();
	};

	tryAgain = () => {
		NetInfo.isConnected.fetch().then(isConnected => {
			if (isConnected) {
				this.props.navigation.pop();
			}
		});
	};

	render() {
		return (
			<View style={styles.container}>
				<SafeAreaView style={styles.innerView}>
					<Image source={astronautImage} style={styles.frame} />
					<View style={styles.content}>
						<Text style={styles.title}>{strings('offline_mode.title')}</Text>
						<Text style={styles.text}>{strings('offline_mode.text')}</Text>
						<StyledButton type={'normal'} onPress={this.tryAgain} containerStyle={styles.button}>
							{strings('offline_mode.try_again')}
						</StyledButton>
					</View>
				</SafeAreaView>
				{Device.isAndroid() && <AndroidBackHandler customBackPress={this.tryAgain} />}
			</View>
		);
	}
}
