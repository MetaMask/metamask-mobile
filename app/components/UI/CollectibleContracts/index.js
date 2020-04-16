import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, Text, View, InteractionManager } from 'react-native';
import { connect } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import CollectibleImage from '../CollectibleImage';
import AssetElement from '../AssetElement';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		minHeight: 500
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
	},
	rows: {
		flex: 1,
		marginLeft: 20,
		marginTop: 8
	},
	name: {
		fontSize: 16,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	amount: {
		fontSize: 12,
		color: colors.grey400,
		...fontStyles.normal
	},
	itemWrapper: {
		flex: 1,
		flexDirection: 'row'
	}
});

/**
 * View that renders a list of CollectibleContract
 * also known as ERC-721 Tokens
 */
class CollectibleContracts extends PureComponent {
	static propTypes = {
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

	renderEmpty = () => (
		<View style={styles.emptyView}>
			<Text style={styles.text}>{strings('wallet.no_collectibles')}</Text>
			{this.renderFooter()}
		</View>
	);

	onItemPress = collectibleContract => {
		this.props.navigation.push('Collectible', collectibleContract);
	};

	goToAddCollectible = () => {
		this.props.navigation.push('AddAsset', { assetType: 'collectible' });
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.WALLET_ADD_COLLECTIBLES);
		});
	};

	renderFooter = () => (
		<View style={styles.footer} key={'collectible-contracts-footer'}>
			<TouchableOpacity style={styles.add} onPress={this.goToAddCollectible} testID={'add-collectible-button'}>
				<Icon name="plus" size={16} color={colors.blue} />
				<Text style={styles.addText}>{strings('wallet.add_collectibles')}</Text>
			</TouchableOpacity>
		</View>
	);

	renderItem = item => {
		const { address, name, logo, symbol } = item;
		const collectibleAmount =
			(this.props.collectibles &&
				this.props.collectibles.filter(
					collectible => collectible.address.toLowerCase() === address.toLowerCase()
				).length) ||
			0;
		return (
			<AssetElement onPress={this.onItemPress} asset={item} key={address}>
				<View style={styles.itemWrapper}>
					<CollectibleImage collectible={{ address, name, image: logo }} />
					<View style={styles.rows}>
						<Text style={styles.name}>{name}</Text>
						<Text style={styles.amount}>
							{collectibleAmount} {symbol}
						</Text>
					</View>
				</View>
			</AssetElement>
		);
	};

	handleOnItemPress = collectibleContract => {
		this.onItemPress(collectibleContract);
	};

	renderList() {
		const { collectibleContracts } = this.props;

		return (
			<View>
				{collectibleContracts.map(item => this.renderItem(item))}
				{this.renderFooter()}
			</View>
		);
	}

	render = () => {
		const { collectibleContracts } = this.props;
		return (
			<View style={styles.wrapper} testID={'collectible-contracts'}>
				{collectibleContracts && collectibleContracts.length ? this.renderList() : this.renderEmpty()}
			</View>
		);
	};
}

const mapStateToProps = state => ({
	collectibleContracts: state.engine.backgroundState.AssetsController.collectibleContracts,
	collectibles: state.engine.backgroundState.AssetsController.collectibles
});

export default connect(mapStateToProps)(CollectibleContracts);
