import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, TouchableOpacity, SafeAreaView } from 'react-native';
import Modal from 'react-native-modal';
import IonicIcon from 'react-native-vector-icons/Ionicons';

import Title from '../../../Base/Title';
import { colors } from '../../../../styles/common';

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
		padding: 25,
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
		marginBottom: 15,
		paddingHorizontal: 20,
	},
});

function InfoModal({ title, body, isVisible, toggleModal, propagateSwipe }) {
	return (
		<Modal
			isVisible={isVisible}
			onBackdropPress={toggleModal}
			onBackButtonPress={toggleModal}
			onSwipeComplete={toggleModal}
			swipeDirection={'down'}
			style={styles.modal}
			propagateSwipe={propagateSwipe}
		>
			<SafeAreaView style={styles.modalView}>
				<View style={styles.title}>
					<Title>{title}</Title>
					<TouchableOpacity onPress={toggleModal} hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }}>
						<IonicIcon name="ios-close" style={styles.closeIcon} size={30} />
					</TouchableOpacity>
				</View>
				<View style={styles.body}>{body}</View>
			</SafeAreaView>
		</Modal>
	);
}
InfoModal.propTypes = {
	isVisible: PropTypes.bool,
	title: PropTypes.node,
	body: PropTypes.node,
	toggleModal: PropTypes.func,
	propagateSwipe: PropTypes.bool,
};

export default InfoModal;
