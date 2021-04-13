'use strict';
import React from 'react';
import { SafeAreaView, Image, View, StyleSheet } from 'react-native';
import Text from '../../Base/Text';
import NetInfo from '@react-native-community/netinfo';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import StyledButton from '../../UI/StyledButton';
import { getOfflineModalNavbar } from '../../UI/Navbar';
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/Device';
import AppConstants from '../../../core/AppConstants';
import { TouchableOpacity } from 'react-native-gesture-handler';

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	frame: {
		width: 200,
		height: 200,
		alignSelf: 'center',
		marginTop: 60
	},
	content: {
		flex: 1,
		marginHorizontal: 18,
		justifyContent: 'center',
		marginVertical: 30
	},
	title: {
		fontSize: 18,
		color: colors.fontPrimary,
		marginBottom: 10,
		...fontStyles.bold
	},
	text: {
		fontSize: 12,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	learnMoreText: {
		marginTop: 30
	},
	buttonContainer: {
		marginHorizontal: 18
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

	const learnMore = () => navigation.navigate('SimpleWebview', { url: AppConstants.URLS.CONNECTIVITY_ISSUES });

	return (
		<SafeAreaView style={styles.container}>
			<Image source={astronautImage} style={styles.frame} />
			<View style={styles.content}>
				<View style={baseStyles.flexGrow}>
					<Text bold centered style={styles.title}>
						{strings('offline_mode.title')}
					</Text>
					<Text centered style={styles.text}>{`Unable to connect to the blockchain host.`}</Text>
					<TouchableOpacity onPress={learnMore}>
						<Text link centered bold style={styles.learnMoreText}>
							{'Learn more'}
						</Text>
					</TouchableOpacity>
				</View>
				<View style={styles.buttonContainer}>
					<StyledButton type={'blue'} onPress={tryAgain}>
						{strings('offline_mode.try_again')}
					</StyledButton>
				</View>
			</View>
			{Device.isAndroid() && <AndroidBackHandler customBackPress={tryAgain} />}
		</SafeAreaView>
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
