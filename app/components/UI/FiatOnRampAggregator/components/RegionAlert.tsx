import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import { colors } from '../../../../styles/common';
import CustomText from '../../../Base/Text';
import StyledButton from '../../StyledButton';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import Box from '../components/Box';

const Text = CustomText as any;

const styles = StyleSheet.create({
	box: {
		backgroundColor: colors.white,
		paddingHorizontal: 20,
		paddingBottom: 20,
	},
	title: {
		fontSize: 18,
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

const RegionAlert: React.FC<Props> = ({ isVisible, title, subtitle, body, dismiss, link }: Props) => (
	<Modal
		isVisible={isVisible}
		onBackdropPress={dismiss}
		swipeDirection="down"
		propagateSwipe
		avoidKeyboard
		//onModalHide={dismiss}
		style={styles.modal}
	>
		<Box style={styles.box}>
			<TouchableOpacity onPress={dismiss} style={styles.cancel}>
				<EvilIcons name="close" size={17} />
			</TouchableOpacity>
			<View style={styles.row}>
				<Text bold primary big style={styles.title}>
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
					Explore App
				</StyledButton>
			</View>
		</Box>
	</Modal>
);

export default RegionAlert;
