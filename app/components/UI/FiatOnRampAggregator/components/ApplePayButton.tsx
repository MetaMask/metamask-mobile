import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { colors as importedColors } from '../../../../styles/common';
import { useAssetFromTheme } from '../../../../util/theme';
import BaseText from '../../../Base/Text';
import StyledButton from '../../StyledButton';

const Text = BaseText as any;

const styles = StyleSheet.create({
	applePayButton: {
		padding: 12,
		alignItems: 'center',
	},
	applePayButtonContentDisabled: {
		opacity: 0.6,
	},
	applePayLogo: {
		marginLeft: 4,
	},
});

const applePayButtonStylesLight = StyleSheet.create({
	applePayButtonText: { color: importedColors.white },
	applePayButton: { backgroundColor: importedColors.black },
});

const applePayButtonStylesDark = StyleSheet.create({
	applePayButtonText: { color: importedColors.black },
	applePayButton: { backgroundColor: importedColors.white },
});

/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
const ApplePayLogoLight = require('../../../../images/ApplePayLogo-light.png');
const ApplePayLogoDark = require('../../../../images/ApplePayLogo-dark.png');
/* eslint-enable import/no-commonjs */
/* eslint-enable @typescript-eslint/no-var-requires */
/* eslint-enable @typescript-eslint/no-require-imports */

const ApplePay = ({ disabled }: { disabled?: boolean }) => {
	const applePayLogo = useAssetFromTheme(ApplePayLogoLight, ApplePayLogoDark);

	return (
		<Image source={applePayLogo} style={[styles.applePayLogo, disabled && styles.applePayButtonContentDisabled]} />
	);
};

const ApplePayButton = ({ label, onPress }: { onPress: () => any; label: string }) => {
	const appleButtonColors = useAssetFromTheme(applePayButtonStylesLight, applePayButtonStylesDark);
	return (
		<StyledButton
			type={'blue'}
			onPress={onPress}
			containerStyle={[styles.applePayButton, appleButtonColors.applePayButton]}
		>
			<Text centered bold style={[appleButtonColors.applePayButtonText]}>
				{label}
			</Text>{' '}
			<ApplePay />
		</StyledButton>
	);
};
export default ApplePayButton;
