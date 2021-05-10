import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import PropTypes from 'prop-types';
import CollectibleOverview from '../../UI/CollectibleOverview';
import { colors } from '../../../styles/common';
import { connect } from 'react-redux';
import collectiblesTransferInformation from '../../../util/collectibles-transfer';
import { newAssetTransaction } from '../../../actions/transaction';
import Modal from 'react-native-modal';
const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.white,
		maxHeight: '90%',
		borderRadius: 20,
		overflow: 'hidden'
	},
	wrapper: {
		flex: 1
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	}
});

/**
 * View that displays a specific collectible asset
 */
const CollectibleModal = ({ contractName, collectible, onHide, visible, navigation, newAssetTransaction }) => {
	const onSend = async () => {
		onHide();
		newAssetTransaction({ contractName, ...collectible });
		navigation.navigate('SendFlowView');
	};

	const isTradable = () => {
		const lowerAddress = collectible.address.toLowerCase();
		const tradable =
			lowerAddress in collectiblesTransferInformation
				? collectiblesTransferInformation[lowerAddress].tradable
				: true;

		return tradable;
	};

	return (
		<Modal
			isVisible={visible}
			style={styles.bottomModal}
			onBackdropPress={onHide}
			onBackButtonPress={onHide}
			onSwipeComplete={onHide}
			swipeDirection={'down'}
			propagateSwipe
		>
			<SafeAreaView style={styles.root}>
				<View style={styles.wrapper} testID={'asset'}>
					<CollectibleOverview
						navigation={navigation}
						collectible={{ ...collectible, contractName }}
						tradable={isTradable()}
						onSend={onSend}
					/>
				</View>
			</SafeAreaView>
		</Modal>
	);
};

CollectibleModal.propTypes = {
	/**
	/* navigation object required to access the props
	/* passed by the parent component
	*/
	navigation: PropTypes.object,
	/**
	 * Start transaction with asset
	 */
	newAssetTransaction: PropTypes.func,
	/**
	 * Collectible being viewed on the modal
	 */
	collectible: PropTypes.object,
	/**
	 * Contract name of the collectible
	 */
	contractName: PropTypes.string,
	/**
	 * Function called when user swipes down the modal
	 */
	onHide: PropTypes.func,
	/**
	 * If the modal should be visible or not
	 */
	visible: PropTypes.bool
};

const mapDispatchToProps = dispatch => ({
	newAssetTransaction: selectedAsset => dispatch(newAssetTransaction(selectedAsset))
});

export default connect(
	null,
	mapDispatchToProps
)(CollectibleModal);
