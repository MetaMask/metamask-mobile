import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import ActionView from '../ActionView';
import AssetSearch from '../AssetSearch';
import AssetList from '../AssetList';
import Engine from '../../../core/Engine';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	}
});

/**
 * Component that provides ability to add searched assets with metadata.
 */
export default class SearchTokenAutocomplete extends Component {
	state = {
		searchResults: [],
		searchQuery: '',
		selectedAsset: {}
	};

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object
	};

	cancelAddToken = () => {
		this.props.navigation.goBack();
	};

	handleSearch = opts => {
		this.setState({ searchResults: opts.results, searchQuery: opts.searchQuery });
	};

	handleSelectAsset = asset => {
		this.setState({ selectedAsset: asset });
	};

	addToken = () => {
		const { AssetsController } = Engine.context;
		const { address, symbol, decimals } = this.state.selectedAsset;
		AssetsController.addToken(address, symbol, decimals);
		this.props.navigation.goBack();
	};

	render = () => {
		const { searchResults, selectedAsset, searchQuery } = this.state;
		const { address, symbol, decimals } = selectedAsset;

		return (
			<View style={styles.wrapper} testID={'search-token-screen'}>
				<ActionView
					cancelText={strings('add_asset.tokens.cancel_add_token')}
					confirmText={strings('add_asset.tokens.add_token')}
					onCancelPress={this.cancelAddToken}
					onConfirmPress={this.addToken}
					confirmDisabled={!(address && symbol && decimals)}
				>
					<View>
						<AssetSearch onSearch={this.handleSearch} />
						<AssetList
							searchResults={searchResults}
							handleSelectAsset={this.handleSelectAsset}
							selectedAsset={selectedAsset}
							searchQuery={searchQuery}
						/>
					</View>
				</ActionView>
			</View>
		);
	};
}
