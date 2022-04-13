import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import CustomText from '../../../Base/Text';
import StyledButton from '../../StyledButton';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import Box from '../components/Box';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
const Text = CustomText as any;

const createStyles = (colors: any) =>
	StyleSheet.create({
		box: {
			backgroundColor: colors.background.default,
			paddingHorizontal: 20,
			paddingBottom: 20,
		},
		cancel: {
			alignSelf: 'flex-end',
		},
		link: {
			paddingBottom: 20,
		},
		modal: {
			padding: 8,
		},
		row: {
			paddingVertical: 10,
		},
	});

interface Props {
	isVisible?: boolean;
	title?: string;
	subtitle?: string;
	body?: string;
	footer?: string;
	dismissButtonText?: string;
	link?: string;
	dismiss?: () => any;
}

const RegionAlert: React.FC<Props> = ({ isVisible, title, subtitle, body, dismiss, link }: Props) => {
	const { colors } = useTheme();
	const styles = createStyles(colors);

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
					<Text bold primary bigger>
						{title}
					</Text>
					<Text black>{subtitle}</Text>
					<View style={styles.row}>
						<Text small>{body}</Text>
					</View>
					<Text blue underline small style={styles.link}>
						{link}
					</Text>
					<StyledButton type="confirm" onPress={dismiss}>
						{strings('fiat_on_ramp_aggregator.region.explore_app')}
					</StyledButton>
				</View>
			</Box>
		</Modal>
	);
};

export default RegionAlert;
