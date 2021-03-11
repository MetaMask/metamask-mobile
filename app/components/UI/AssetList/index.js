import React, { PureComponent } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import StyledButton from '../StyledButton'; // eslint-disable-line  import/no-unresolved
import AssetIcon from '../AssetIcon';
import { fontStyles } from '../../../styles/common';

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
		...fontStyles.normal,
		padding: 16
	},
	normalText: {
		...fontStyles.normal
	}
});

/**
 * PureComponent that provides ability to search assets.
 */
export default class AssetList extends PureComponent {
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
		selectedAsset: PropTypes.object,
		/**
		 * Search query that generated "searchResults"
		 */
		searchQuery: PropTypes.string
	};

	onToggleAsset = key => {
		const { searchResults, handleSelectAsset } = this.props;
		handleSelectAsset(searchResults[key]);
	};

	render = () => {
		const { searchResults = [], handleSelectAsset, selectedAsset } = this.props;

		return (
			<View style={styles.rowWrapper} testID={'add-searched-token-screen'}>
				{searchResults.length > 0 ? (
					<Text style={styles.normalText} testID={'select-token-title'}>
						{strings('token.select_token')}
					</Text>
				) : null}
				{searchResults.length === 0 && this.props.searchQuery.length ? (
					<Text style={styles.normalText}>{strings('token.no_tokens_found')}</Text>
				) : null}
				{searchResults.slice(0, 6).map((_, i) => {
					const { symbol, name, address, logo } = searchResults[i] || {};
					const isSelected = selectedAsset && selectedAsset.address === address;
					return (
						<StyledButton
							type={isSelected ? 'normal' : 'transparent'}
							containerStyle={styles.item}
							onPress={() => handleSelectAsset(searchResults[i])} // eslint-disable-line
							key={i}
							testID={'searched-token-result'}
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
