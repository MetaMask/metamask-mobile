import React, { memo } from 'react';
import { View, Text, Linking, Alert, StyleSheet } from 'react-native';
import { colors } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import LineDivide from '../../../Base/LineDivide';

const styles = StyleSheet.create({
	descriptionContainer: {
		marginBottom: 10,
	},
	contentContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	numberStyle: {
		marginRight: 10,
	},
	link: {
		color: colors.blue,
	},
	description: {
		width: '94%',
	},
});

interface DescriptionProps {
	description: string;
	clickableText: string | undefined;
	number: number;
	navigation: any;
}

const showAlertView = () => {
	Alert.alert(strings('network_information.error_title'), strings('network_information.error_message'));
};

const Description = (props: DescriptionProps) => {
	const { description, clickableText, number, navigation } = props;

	const handlePress = () => {
		if (number === 2) {
			Linking.canOpenURL(strings('network_information.learn_more_url')).then((supported) => {
				if (supported) {
					Linking.openURL(strings('network_information.learn_more_url'));
				} else {
					showAlertView();
				}
			});
		} else {
			navigation.push('AddAsset', { assetType: 'token' });
		}
	};

	return (
		<View style={styles.descriptionContainer}>
			<View style={styles.contentContainer}>
				<Text style={styles.numberStyle}>{number}.</Text>
				<Text style={styles.description}>
					<Text>{description}</Text>
					{clickableText && (
						<Text onPress={handlePress} style={styles.link}>
							{' '}
							{clickableText}
						</Text>
					)}
				</Text>
			</View>
			<LineDivide />
		</View>
	);
};

export default memo(Description);
