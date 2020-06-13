import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import Title from '../Title';

import { colors } from '../../../../../styles/common';
import StyledButton from '../../../StyledButton';

const styles = StyleSheet.create({
	modalView: {
		backgroundColor: colors.white,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 10,
		shadowColor: colors.black,
		shadowOffset: {
			width: 0,
			height: 5
		},
		shadowOpacity: 0.36,
		shadowRadius: 6.68,
		elevation: 11
	},

	modal: {
		margin: 0,
		width: '100%',
		padding: 25
	},
	title: {
		width: '100%',
		paddingVertical: 15,
		paddingHorizontal: 20,
		paddingBottom: 5,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	closeIcon: {
		color: colors.black
	},
	body: {
		borderColor: colors.red,
		borderWidth: 0,
		width: '100%',

		paddingVertical: 5,
		paddingHorizontal: 20
	},
	action: {
		width: '100%',
		alignItems: 'center',
		marginTop: 15,
		paddingVertical: 15,
		paddingHorizontal: 20,
		borderTopWidth: 1,
		borderTopColor: colors.grey100
	},
	button: {
		width: '50%'
	}
});

const CloseIcon = props => <IonicIcon name="ios-close" style={styles.closeIcon} size={30} {...props} />;

const PaymentMethodModal = ({ isVisible, title, dismiss, children }) => (
	<Modal
		isVisible={isVisible}
		onBackdropPress={dismiss}
		onBackButtonPress={dismiss}
		onSwipeComplete={dismiss}
		swipeDirection="down"
		style={styles.modal}
		useNativeDriver
	>
		<View style={styles.modalView}>
			<View style={styles.title}>
				<Title>{title}</Title>
				<TouchableOpacity onPress={dismiss}>
					<CloseIcon />
				</TouchableOpacity>
			</View>
			<View style={styles.body}>{children}</View>
			<View style={styles.action}>
				<StyledButton type="blue" onPress={dismiss} containerStyle={[styles.button]}>
					Close
				</StyledButton>
			</View>
		</View>
	</Modal>
);

PaymentMethodModal.propTypes = {
	isVisible: PropTypes.bool,
	title: PropTypes.string.isRequired,
	dismiss: PropTypes.func,
	children: PropTypes.node
};

PaymentMethodModal.defaultProps = {
	isVisible: false,
	dismiss: undefined,
	children: undefined
};

export default PaymentMethodModal;
