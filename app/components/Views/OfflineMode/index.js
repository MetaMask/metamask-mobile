'use strict';
import React from 'react';
import { SafeAreaView, Image, Text, View, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { colors, fontStyles } from '../../../styles/common';
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
		marginBottom: 30
	},
	content: {
		flex: 1,
		marginHorizontal: 18,
		alignSelf: 'center',
		justifyContent: 'center'
	},
	text: {
		flex: 1,
		fontSize: 12,
		color: colors.fontPrimary,
		textAlign: 'center',
		justifyContent: 'center',
		...fontStyles.normal
	},
	title: {
		fontSize: 18,
		color: colors.fontPrimary,
		textAlign: 'center',
		justifyContent: 'center',
		marginBottom: 10,
		...fontStyles.bold
	}
});

const astronautImage = require('../../../images/astronaut.png'); // eslint-disable-line import/no-commonjs

const OfflineMode = ({ navigation }) => {
	const tryAgain = () => {
		NetInfo.isConnected.fetch().then(isConnected => {
			if (isConnected) {
				navigation.pop();
			}
		});
	};

	return (
		<View style={styles.container}>
			<SafeAreaView style={styles.innerView}>
				<Image source={astronautImage} style={styles.frame} />
				<View style={styles.content}>
					<Text style={styles.title}>{strings('offline_mode.title')}</Text>
					<Text
						style={styles.text}
					>{`MetaMask is unable to reach our hosted blockchain connection. Visit this guide to review possible reasons.`}</Text>
					<View>
						<StyledButton type={'normal'} onPress={tryAgain}>
							{strings('offline_mode.try_again')}
						</StyledButton>
						<StyledButton type={'blue'} onPress={tryAgain}>
							{'Learn more'}
						</StyledButton>
					</View>
				</View>
			</SafeAreaView>
			{Device.isAndroid() && <AndroidBackHandler customBackPress={tryAgain} />}
		</View>
	);
};

OfflineMode.navigationOptions = ({ navigation }) => getOfflineModalNavbar(navigation);

OfflineMode.propTypes = {
	/**
	 * Object that represents the navigator
	 */
	navigation: PropTypes.object
};

export default OfflineMode;
