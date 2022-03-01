/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { colors } from '../../../../styles/common';

interface IConnectQRInstructionProps {
	navigation: any;
	onConnect: () => void;
	renderAlert: () => Element;
}

const connectQRHardwareImg = require('images/connect-qr-hardware.png'); // eslint-disable-line import/no-commonjs

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		width: '100%',
		alignItems: 'center',
	},
	container: {
		width: '100%',
		flexDirection: 'column',
		alignItems: 'center',
		paddingHorizontal: 32,
	},
	scrollWrapper: {
		width: '100%',
	},
	title: {
		width: '100%',
		marginTop: 40,
		fontSize: 24,
		marginBottom: 20,
	},
	textContainer: {
		width: '100%',
		marginTop: 20,
	},
	text: {
		fontSize: 14,
		marginBottom: 24,
	},
	link: {
		color: colors.blue,
		fontWeight: '700',
	},
	button: {
		backgroundColor: colors.blue,
		width: '80%',
		borderRadius: 25,
		height: 50,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 12,
		marginBottom: 32,
		marginTop: 16,
	},
	buttonText: {
		color: colors.white,
	},
	image: {
		width: 300,
		height: 120,
		marginTop: 40,
		marginBottom: 40,
	},
});

const ConnectQRInstruction = (props: IConnectQRInstructionProps) => {
	const { onConnect, renderAlert, navigation } = props;
	const navigateToVideo = () => {
		navigation.navigate('Webview', {
			screen: 'SimpleWebview',
			params: {
				url: 'https://keyst.one/mmmvideo',
				title: strings('connect_qr_hardware.description2'),
			},
		});
	};
	const navigateToTutorial = () => {
		navigation.navigate('Webview', {
			screen: 'SimpleWebview',
			params: {
				url: 'https://keyst.one/mmm',
				title: strings('connect_qr_hardware.description4'),
			},
		});
	};
	return (
		<View style={styles.wrapper}>
			<ScrollView contentContainerStyle={styles.container} style={styles.scrollWrapper}>
				<Text style={styles.title}>{strings('connect_qr_hardware.title')}</Text>
				{renderAlert()}
				<View style={styles.textContainer}>
					<Text style={styles.text}>{strings('connect_qr_hardware.description1')}</Text>
					<Text style={[styles.text, styles.link]} onPress={navigateToVideo}>
						{strings('connect_qr_hardware.description2')}
					</Text>
					<Text style={styles.text}>{strings('connect_qr_hardware.description3')}</Text>
					<Text style={[styles.text, styles.link]} onPress={navigateToTutorial}>
						{strings('connect_qr_hardware.description4')}
					</Text>
				</View>
				<Image style={styles.image} source={connectQRHardwareImg} resizeMode={'contain'} />
			</ScrollView>
			<TouchableOpacity onPress={onConnect} style={styles.button}>
				<Text style={styles.buttonText}>{strings('connect_qr_hardware.button_continue')}</Text>
			</TouchableOpacity>
		</View>
	);
};

export default ConnectQRInstruction;
