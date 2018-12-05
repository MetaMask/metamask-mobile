import React, { Component } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { strings } from '../../../locales/i18n';
import StyledButton from '../StyledButton'; // eslint-disable-line  import/no-unresolved
import AssetIcon from '../AssetIcon';

const styles = StyleSheet.create({
	rowWrapper: {
		padding: 20
	},
	item: {
		marginBottom: 5,
		borderWidth: 2
	},
	assetListElement: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'flex-start'
	},
	text: {
		padding: 16
	}
});

/**
 * Component that provides ability to search assets.
 */
export default class AssetSearch extends Component {
	state = {
		searchQuery: ''
	};

	static propTypes = {
		/**
		 * Array of assets objects returned from the search
		 */
		searchResults: PropTypes.array,
		/**
		 * Callback triggered when a token is selected
		 */
		handleSelectAsset: PropTypes.func,
		/**
		 * Object of the currently-selected token
		 */
		selectedAsset: PropTypes.object
	};

	onToggleAsset = key => {
		const { searchResults, handleSelectAsset } = this.props;
		handleSelectAsset(searchResults[key]);
	};

	render = () => {
		const { searchResults = [], handleSelectAsset, selectedAsset } = this.props;

		return (
			<View style={styles.rowWrapper} testID={'add-searched-token-screen'}>
				<Text>{strings('token.select_token')}</Text>
				{searchResults.slice(0, 6).map((_, i) => {
					const { symbol, name, address, logo } = searchResults[i] || {};
					const isSelected = selectedAsset && selectedAsset.address === address;
					return (
						<StyledButton
							type={isSelected ? 'normal' : 'transparent'}
							containerStyle={styles.item}
							onPress={() => handleSelectAsset(searchResults[i])} // eslint-disable-line
							key={i}
						>
							<View style={styles.assetListElement}>
								<AssetIcon logo={logo} />
								<Text style={styles.text}>
									{name} ({symbol})
								</Text>
							</View>
						</StyledButton>
					);
				})}
			</View>
		);
	};
}
