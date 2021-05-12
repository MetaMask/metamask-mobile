import React from 'react';
import { View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import CollectibleOverview from '../../UI/CollectibleOverview';
import { connect } from 'react-redux';
import collectiblesTransferInformation from '../../../util/collectibles-transfer';
import { newAssetTransaction } from '../../../actions/transaction';
import Modal from 'react-native-modal';
import CollectibleMedia from '../CollectibleMedia';
const styles = StyleSheet.create({
	root: {
		flex: 1,
		maxHeight: '85%',
		overflow: 'hidden'
	},
	wrapper: {
		flex: 1,
		borderRadius: 20
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	noRound: {
		borderRadius: 0
	},
	collectibleMediaWrapper: {
		marginHorizontal: 16
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

	const openLink = url => {
		onHide();
		navigation.navigate('SimpleWebview', { url });
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
			<View style={styles.root}>
				<View style={styles.collectibleMediaWrapper}>
					<CollectibleMedia cover renderAnimation collectible={collectible} style={styles.noRound} />
				</View>
				<View style={styles.wrapper}>
					<CollectibleOverview
						navigation={navigation}
						collectible={{ ...collectible, contractName }}
						tradable={isTradable()}
						onSend={onSend}
						openLink={openLink}
					/>
				</View>
			</View>
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
