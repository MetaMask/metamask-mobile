import React, { memo } from 'react';
import { View, Text, Linking, StyleSheet } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { useAppThemeFromContext, mockTheme } from '../../../../util/theme';

const createStyles = (colors: {
	background: { default: string };
	text: { default: string };
	border: { muted: string };
	info: { default: string };
}) =>
	StyleSheet.create({
		descriptionContainer: {
			marginBottom: 10,
			borderBottomWidth: StyleSheet.hairlineWidth,
			borderColor: colors.border.muted,
		},
		contentContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 4,
		},
		numberStyle: {
			marginRight: 10,
			color: colors.text.default,
		},
		link: {
			color: colors.info.default,
		},
		description: {
			width: '94%',
			color: colors.text.default,
		},
	});

interface DescriptionProps {
	description: string;
	clickableText: string | undefined;
	number: number;
	navigation: any;
	onClose: () => void;
}

const Description = (props: DescriptionProps) => {
	const { description, clickableText, number, navigation, onClose } = props;
	const { colors } = useAppThemeFromContext() || mockTheme;
	const styles = createStyles(colors);

	const handlePress = () => {
		if (number === 2) {
			Linking.openURL(strings('network_information.learn_more_url'));
		} else {
			onClose();
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
		</View>
	);
};

export default memo(Description);
