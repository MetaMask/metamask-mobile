import React, { Component } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { strings } from '../../../locales/i18n';
import StyledButton from '../StyledButton'; // eslint-disable-line  import/no-unresolved

const styles = StyleSheet.create({
	rowWrapper: {
		padding: 20
	},
	item: {
		padding: 20,
		marginBottom: 5,
		borderWidth: 1
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

	render() {
		const { searchResults = [], handleSelectAsset, selectedAsset } = this.props;

		return (
			<View style={styles.rowWrapper} testID={'add-searched-token-screen'}>
				<Text>{strings('token.select_token')}</Text>
				{Array(6)
					.fill(undefined)
					.map((_, i) => {
						const { symbol, name, address } = searchResults[i] || {};
						const isSelected = selectedAsset && selectedAsset.address === address;
						return (
							Boolean(address || name || symbol) && (
								<StyledButton
									type={isSelected ? 'normal' : 'transparent'}
									containerStyle={styles.item}
									onPress={() => handleSelectAsset(searchResults[i])} // eslint-disable-line
									key={i}
								>
									<Text>
										{name} ({symbol})
									</Text>
								</StyledButton>
							)
						);
					})}
			</View>
		);
	}
}
