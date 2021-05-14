import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import CollectibleOverview from '../../UI/CollectibleOverview';
import { connect } from 'react-redux';
import collectiblesTransferInformation from '../../../util/collectibles-transfer';
import { newAssetTransaction } from '../../../actions/transaction';
import Modal from 'react-native-modal';
import CollectibleMedia from '../CollectibleMedia';
import { baseStyles } from '../../../styles/common';

const styles = StyleSheet.create({
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	round: {
		borderRadius: 12
	},
	collectibleMediaWrapper: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		marginHorizontal: 16,
		marginTop: '20%',
		marginBottom: '0%',
		overflow: 'visible'
	}
});

/**
 * View that displays a specific collectible asset
 */
const CollectibleModal = ({ contractName, collectible, onHide, visible, navigation, newAssetTransaction }) => {
	const [swippable, setSwippable] = useState('down');
	const [mediaZIndex, setMediaZIndex] = useState(20);
	const [overviewZIndex, setOverviewZIndex] = useState(10);

	const onSend = useCallback(async () => {
		onHide();
		newAssetTransaction({ contractName, ...collectible });
		navigation.navigate('SendFlowView');
	}, [contractName, collectible, newAssetTransaction, onHide, navigation]);

	const isTradable = useCallback(() => {
		const lowerAddress = collectible.address.toLowerCase();
		const tradable =
			lowerAddress in collectiblesTransferInformation
				? collectiblesTransferInformation[lowerAddress].tradable
				: true;

		return tradable;
	}, [collectible.address]);

	const openLink = url => {
		onHide();
		navigation.navigate('SimpleWebview', { url });
	};

	const onTouchStart = useCallback(() => setSwippable(null), []);

	const onTouchEnd = useCallback(() => setSwippable('down'), []);

	/**
	 * Method that moves the collectible media up or down in the screen depending on
	 * the animation status, to be able to interact with videos
	 *
	 * @param {boolean} moveUp
	 */
	const onCollectibleOverviewTranslation = moveUp => {
		if (moveUp) {
			setTimeout(() => {
				setMediaZIndex(20);
				setOverviewZIndex(10);
			}, 250);
		} else {
			setMediaZIndex(0);
			setOverviewZIndex(10);
		}
	};

	return (
		<Modal
			isVisible={visible}
			style={styles.bottomModal}
			onBackdropPress={onHide}
			onBackButtonPress={onHide}
			onSwipeComplete={onHide}
			swipeDirection={swippable}
			propagateSwipe
		>
			<View coverScreen style={[styles.collectibleMediaWrapper, { zIndex: mediaZIndex, elevation: mediaZIndex }]}>
				<CollectibleMedia cover renderAnimation collectible={collectible} style={styles.round} />
			</View>
			<View style={[baseStyles.flexStatic, { zIndex: overviewZIndex, elevation: overviewZIndex }]}>
				<CollectibleOverview
					onTouchStart={onTouchStart}
					onTouchEnd={onTouchEnd}
					navigation={navigation}
					collectible={{ ...collectible, contractName }}
					tradable={isTradable()}
					onSend={onSend}
					openLink={openLink}
					onTranslation={onCollectibleOverviewTranslation}
					onHide={onHide}
				/>
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
