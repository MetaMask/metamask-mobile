import React from 'react';
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
}

const learnMoreUrl = 'https://metamask.zendesk.com/hc/en-us/articles/4404424659995';

const showAlertView = () => {
	Alert.alert(strings('network_information.error_title'), strings('network_information.error_message'));
};

const openUrl = () => {
	Linking.canOpenURL(learnMoreUrl).then((supported) => {
		if (supported) {
			Linking.openURL(learnMoreUrl);
		} else {
			showAlertView();
		}
	});
};

const Description = (props: DescriptionProps) => {
	const { description, clickableText, number } = props;
	return (
		<View style={styles.descriptionContainer}>
			<View style={styles.contentContainer}>
				<Text style={styles.numberStyle}>{number}.</Text>
				<Text style={styles.description}>
					<Text>{description}</Text>
					{clickableText && (
						<Text onPress={openUrl} style={styles.link}>
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

export default Description;
