/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { fontStyles, colors as importedColors } from '../../../../styles/common';
import { useAppThemeFromContext, mockTheme } from '../../../../util/theme';

interface IConnectQRInstructionProps {
	navigation: any;
	onConnect: () => void;
	renderAlert: () => Element;
}

const connectQRHardwareImg = require('images/connect-qr-hardware.png'); // eslint-disable-line import/no-commonjs

const createStyles = (colors: any) =>
	StyleSheet.create({
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
			...fontStyles.normal,
			color: colors.text.alternative,
		},
		textContainer: {
			width: '100%',
			marginTop: 20,
		},
		text: {
			fontSize: 14,
			marginBottom: 24,
			...fontStyles.normal,
			color: colors.text.alternative,
		},
		link: {
			color: colors.primary.default,
			...fontStyles.bold,
		},
		button: {
			backgroundColor: colors.primary.default,
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
			color: importedColors.white,
			...fontStyles.normal,
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
	const { colors } = useAppThemeFromContext() || mockTheme;
	const styles = createStyles(colors);

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
					<Text style={styles.text}>{strings('connect_qr_hardware.description5')}</Text>
					<Text style={styles.text}>{strings('connect_qr_hardware.description6')}</Text>
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
