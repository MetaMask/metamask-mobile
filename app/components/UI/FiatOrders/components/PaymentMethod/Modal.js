import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import Modal from 'react-native-modal';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { strings } from '../../../../../../locales/i18n';

import Title from '../Title';
import { colors } from '../../../../../styles/common';
import StyledButton from '../../../StyledButton';
import Device from '../../../../../util/device';

const styles = StyleSheet.create({
	modalView: {
		backgroundColor: colors.white,
		justifyContent: 'center',
		alignItems: 'center',
		marginVertical: 50,
		borderRadius: 10,
		shadowColor: colors.black,
		shadowOffset: {
			width: 0,
			height: 5,
		},
		shadowOpacity: 0.36,
		shadowRadius: 6.68,
		elevation: 11,
	},
	modal: {
		margin: 0,
		width: '100%',
		padding: Device.isIphone5() ? 15 : 25,
	},
	title: {
		width: '100%',
		paddingVertical: 15,
		paddingHorizontal: 20,
		paddingBottom: 5,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	closeIcon: {
		color: colors.black,
	},
	body: {
		width: '100%',
		paddingVertical: 5,
		paddingHorizontal: 20,
	},
	action: {
		width: '100%',
		alignItems: 'center',
		marginTop: 15,
		paddingVertical: 15,
		paddingHorizontal: 20,
		borderTopWidth: 1,
		borderTopColor: colors.grey100,
	},
	button: {
		width: '50%',
	},
});

const CloseIcon = (props) => <IonicIcon name="ios-close" style={styles.closeIcon} size={30} {...props} />;

const PaymentMethodModal = ({ isVisible, title, dismiss, children }) => (
	<Modal
		isVisible={isVisible}
		onBackdropPress={dismiss}
		onBackButtonPress={dismiss}
		onSwipeComplete={dismiss}
		swipeDirection="down"
		style={styles.modal}
		propagateSwipe
	>
		<SafeAreaView style={styles.modalView}>
			<View style={styles.title}>
				<Title>{title}</Title>
				<TouchableOpacity onPress={dismiss} hitSlop={{ top: 20, right: 20, bottom: 20, left: 20 }}>
					<CloseIcon />
				</TouchableOpacity>
			</View>
			<ScrollView style={styles.body}>
				<View onStartShouldSetResponder={() => true}>{children}</View>
			</ScrollView>
			<View style={styles.action}>
				<StyledButton type="blue" onPress={dismiss} containerStyle={[styles.button]}>
					{strings('fiat_on_ramp.purchase_method_modal_close')}
				</StyledButton>
			</View>
		</SafeAreaView>
	</Modal>
);

PaymentMethodModal.propTypes = {
	isVisible: PropTypes.bool,
	title: PropTypes.string.isRequired,
	dismiss: PropTypes.func,
	children: PropTypes.node,
};

PaymentMethodModal.defaultProps = {
	isVisible: false,
	dismiss: undefined,
	children: undefined,
};

export default PaymentMethodModal;
