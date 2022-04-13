import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View, Linking } from 'react-native';
import Modal from 'react-native-modal';

import CustomText from '../../../Base/Text';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import Box from '../components/Box';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';

const Text = CustomText as any;

const createStyles = (colors: any) =>
	StyleSheet.create({
		box: {
			backgroundColor: colors.background.default,
			paddingHorizontal: 20,
			paddingBottom: 20,
		},
		title: {
			fontSize: 18,
		},
		cancel: {
			alignSelf: 'flex-end',
		},
		modal: {
			padding: 8,
		},
		row: {
			paddingVertical: 8,
		},
		paddingAndFont: {
			padding: 3,
			fontSize: 10,
		},
	});

interface Props {
	isVisible?: boolean;
	providerName?: string;
	subtitle?: string;
	body?: string;
	footer?: string;
	dismissButtonText?: string;
	providerWebsite: string;
	providerPrivacyPolicy: string;
	providerSupport: string;
	dismiss?: () => any;
}

const InfoAlert: React.FC<Props> = ({
	isVisible,
	providerName,
	subtitle,
	body,
	dismiss,
	providerWebsite,
	providerPrivacyPolicy,
	providerSupport,
}: Props) => {
	const { colors } = useTheme();
	const styles = createStyles(colors);
	const handleLinkPress = useCallback(async (url: string) => {
		const supported = await Linking.canOpenURL(url);
		if (supported) {
			await Linking.openURL(url);
		}
	}, []);

	return (
		<Modal
			isVisible={isVisible}
			onBackdropPress={dismiss}
			swipeDirection="down"
			propagateSwipe
			avoidKeyboard
			style={styles.modal}
		>
			<Box style={styles.box}>
				<TouchableOpacity onPress={dismiss} style={styles.cancel}>
					<EvilIcons name="close" size={17} color={colors.icon.default} />
				</TouchableOpacity>
				<View style={styles.row}>
					<Text bold primary big centered style={styles.title}>
						{providerName}
					</Text>
					<Text style={styles.paddingAndFont}>{subtitle}</Text>
					<View style={styles.row}>
						<Text small>{body}</Text>
					</View>
					<TouchableOpacity onPress={() => handleLinkPress(providerWebsite)}>
						<Text blue underline small centered style={styles.paddingAndFont}>
							{providerWebsite}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity onPress={() => handleLinkPress(providerPrivacyPolicy)}>
						<Text blue underline small centered style={styles.paddingAndFont}>
							{strings('app_information.privacy_policy')}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity onPress={() => handleLinkPress(providerSupport)}>
						<Text blue underline small centered style={styles.paddingAndFont}>
							{providerName + ' ' + strings('fiat_on_ramp_aggregator.support')}
						</Text>
					</TouchableOpacity>
				</View>
			</Box>
		</Modal>
	);
};
export default InfoAlert;
