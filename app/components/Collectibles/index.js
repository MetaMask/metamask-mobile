import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ScrollView, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import CollectibleElement from '../CollectibleElement';
import ActionSheet from 'react-native-actionsheet';
import Engine from '../../core/Engine';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	emptyView: {
		marginTop: 80,
		alignItems: 'center',
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center'
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
		color: colors.primary,
		...fontStyles.normal
	}
});

/**
 * View that renders a list of Collectibles
 * also known as ERC-721 Tokens
 */
export default class Collectibles extends Component {
	static propTypes = {
		/**
		 * Navigation object required to push
		 * the Asset detail view
		 */
		navigation: PropTypes.object,
		/**
		 * Array of assets (in this case Collectibles)
		 */
		collectibles: PropTypes.array,
		/**
		 * Callback triggered when collectible pressed from collectibles list
		 */
		onPress: PropTypes.func
	};

	actionSheet = null;

	collectibleToRemove = null;

	renderEmpty = () => (
		<View style={styles.emptyView}>
			<Text style={styles.text}>{strings('wallet.no_collectibles')}</Text>
		</View>
	);

	onItemPress = collectible => {
		this.props.navigation.push('Collectible', collectible);
	};

	handleOnPress = collectible => {
		this.props.onPress(collectible);
	};

	renderList() {
		return this.props.collectibles.map(collectible => (
			<CollectibleElement
				collectible={collectible}
				key={collectible.tokenId}
				onPress={this.handleOnPress}
				onLongPress={this.showRemoveMenu}
			/>
		));
	}

	goToAddCollectible = () => {
		this.props.navigation.push('AddAsset', { assetType: 'collectible' });
	};

	showRemoveMenu = collectible => {
		this.collectibleToRemove = collectible;
		this.actionSheet.show();
	};

	removeCollectible = () => {
		const { AssetsController } = Engine.context;
		AssetsController.removeCollectible(this.collectibleToRemove.address, this.collectibleToRemove.tokenId);
	};

	createActionSheetRef = ref => {
		this.actionSheet = ref;
	};

	render = () => {
		const { collectibles } = this.props;
		return (
			<ScrollView style={styles.wrapper}>
				<View testID={'collectibles'}>
					{collectibles && collectibles.length ? this.renderList() : this.renderEmpty()}
					<TouchableOpacity
						style={styles.add}
						onPress={this.goToAddCollectible}
						testID={'add-collectible-button'}
					>
						<Icon name="plus" size={16} color={colors.primary} />
						<Text style={styles.addText}>{strings('wallet.add_collectibles').toUpperCase()}</Text>
					</TouchableOpacity>
					<ActionSheet
						ref={this.createActionSheetRef}
						title={strings('wallet.remove_collectible_title')}
						options={[strings('wallet.remove'), strings('wallet.cancel')]}
						cancelButtonIndex={1}
						destructiveButtonIndex={0}
						// eslint-disable-next-line react/jsx-no-bind
						onPress={index => (index === 0 ? this.removeCollectible() : null)}
					/>
				</View>
			</ScrollView>
		);
	};
}
