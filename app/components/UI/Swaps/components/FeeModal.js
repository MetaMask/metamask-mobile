import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-navigation';
import Modal from 'react-native-modal';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { strings } from '../../../../../locales/i18n';

import Title from '../../../Base/Title';
import Text from '../../../Base/Text';
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

function FeeModal({ fee = '0.875%', isVisible, toggleModal }) {
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
					<Title>{strings('swaps.metamask_swap_fee')}</Title>
					<TouchableOpacity onPress={toggleModal}>
						<IonicIcon name="ios-close" style={styles.closeIcon} size={30} />
					</TouchableOpacity>
				</View>
				<View style={styles.body}>
					<Text>
						{strings('swaps.fee_text.get_the')} <Text bold>{strings('swaps.fee_text.best_price')}</Text>{' '}
						{strings('swaps.fee_text.from_the')} <Text bold>{strings('swaps.fee_text.top_liquidity')}</Text>{' '}
						{strings('swaps.fee_text.fee_is_applied', { fee })}
					</Text>
				</View>
			</SafeAreaView>
		</Modal>
	);
}
FeeModal.propTypes = {
	fee: PropTypes.string,
	isVisible: PropTypes.bool,
	toggleModal: PropTypes.func
};

export default FeeModal;
