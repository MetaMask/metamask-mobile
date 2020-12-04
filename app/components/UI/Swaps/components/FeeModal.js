import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-navigation';
import Modal from 'react-native-modal';
import IonicIcon from 'react-native-vector-icons/Ionicons';

import Title from '../../../Base/Title';
import { colors } from '../../../../styles/common';
import Text from '../../../Base/Text';

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
		width: '100%',
		paddingVertical: 5,
		marginBottom: 15,
		paddingHorizontal: 20
	}
});

function FeeModal({ isVisible, toggleModal }) {
	return (
		<Modal
			isVisible={isVisible}
			onBackdropPress={toggleModal}
			onBackButtonPress={toggleModal}
			onSwipeComplete={toggleModal}
			swipeDirection="down"
			style={styles.modal}
		>
			<SafeAreaView style={styles.modalView}>
				<View style={styles.title}>
					<Title>MetaMask Swap fee</Title>
					<TouchableOpacity onPress={toggleModal}>
						<IonicIcon name="ios-close" style={styles.closeIcon} size={30} />
					</TouchableOpacity>
				</View>
				<View style={styles.body}>
					<Text>
						Get the <Text bold>best price</Text> from the{' '}
						<Text bold>top liquidity sources, every time</Text>. A fee of 0.875% is automatically factored
						into each quote, which supports ongoing development to make MetaMask even better.
					</Text>
				</View>
			</SafeAreaView>
		</Modal>
	);
}
FeeModal.propTypes = {
	isVisible: PropTypes.bool,
	toggleModal: PropTypes.func
};

export default FeeModal;
