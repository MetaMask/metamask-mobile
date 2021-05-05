import React from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, Text, View, InteractionManager } from 'react-native';
import { connect } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import CollectibleContractElement from '../CollectibleContractElement';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		minHeight: 500,
		marginTop: 16
	},
	emptyView: {
		backgroundColor: colors.white,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 50
	},
	text: {
		fontSize: 20,
		color: colors.fontTertiary,
		...fontStyles.normal
	},
	add: {
		margin: 20,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	addText: {
		fontSize: 15,
		color: colors.blue,
		...fontStyles.normal
	},
	footer: {
		flex: 1,
		paddingBottom: 30
	}
});

/**
 * View that renders a list of CollectibleContract
 * also known as ERC-721 Tokens
 */
function CollectibleContracts({ collectibleContracts, collectibles, navigation }) {
	const onItemPress = collectibleContract => navigation.push('Collectible', collectibleContract);

	const goToAddCollectible = () => {
		navigation.push('AddAsset', { assetType: 'collectible' });
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.WALLET_ADD_COLLECTIBLES);
		});
	};

	const renderFooter = () => (
		<View style={styles.footer} key={'collectible-contracts-footer'}>
			<TouchableOpacity style={styles.add} onPress={goToAddCollectible} testID={'add-collectible-button'}>
				<Icon name="plus" size={16} color={colors.blue} />
				<Text style={styles.addText}>{strings('wallet.add_collectibles')}</Text>
			</TouchableOpacity>
		</View>
	);

	const renderCollectibleContract = (item, index) => {
		const contractCollectibles = collectibles?.filter(
			collectible => collectible.address.toLowerCase() === item.address.toLowerCase()
		);
		return (
			<CollectibleContractElement
				onPress={onItemPress}
				asset={item}
				key={item.address}
				contractCollectibles={contractCollectibles}
				collectiblesVisible={index === 0}
			/>
		);
	};

	const renderList = () => (
		<View>{collectibleContracts.map((item, index) => renderCollectibleContract(item, index))}</View>
	);

	const renderEmpty = () => (
		<View style={styles.emptyView}>
			<Text style={styles.text}>{strings('wallet.no_collectibles')}</Text>
		</View>
	);

	return (
		<View style={styles.wrapper} testID={'collectible-contracts'}>
			{collectibleContracts?.length ? renderList() : renderEmpty()}
			{renderFooter()}
		</View>
	);
}

CollectibleContracts.propTypes = {
	/**
	 * Array of collectibleContract objects
	 */
	collectibleContracts: PropTypes.array,
	/**
	 * Array of collectibles objects
	 */
	collectibles: PropTypes.array,
	/**
	 * Navigation object required to push
	 * the Asset detail view
	 */
	navigation: PropTypes.object
};

const mapStateToProps = state => ({
	collectibleContracts: state.engine.backgroundState.AssetsController.collectibleContracts,
	collectibles: state.engine.backgroundState.AssetsController.collectibles
});

export default connect(mapStateToProps)(CollectibleContracts);
