import React, { PureComponent } from 'react';
import { View, StyleSheet, InteractionManager } from 'react-native';
import { colors } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import ActionView from '../ActionView';
import AssetSearch from '../AssetSearch';
import AssetList from '../AssetList';
import Engine from '../../../core/Engine';
import AnalyticsV2 from '../../../util/analyticsV2';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	}
});

/**
 * PureComponent that provides ability to add searched assets with metadata.
 */
export default class SearchTokenAutocomplete extends PureComponent {
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

	componentDidMount = () => {
		this.getAnalyticsParams();
	};

	getAnalyticsParams = () => {
		const { NetworkController } = Engine.context;
		const { chainId, type } = NetworkController?.state?.provider || {};
		const { address, symbol } = this.state.selectedAsset;
		return {
			token_address: { value: address, anonymous: true },
			token_symbol: { value: symbol, anonymous: true },
			network_name: type,
			chain_id: chainId,
			source: 'Add token dropdown'
		};
	};

	addToken = async () => {
		const { AssetsController } = Engine.context;
		const { address, symbol, decimals } = this.state.selectedAsset;
		await AssetsController.addToken(address, symbol, decimals);

		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.TOKEN_ADDED, this.getAnalyticsParams());

		// Clear state before closing
		this.setState(
			{
				searchResults: [],
				searchQuery: '',
				selectedAsset: {}
			},
			() => {
				InteractionManager.runAfterInteractions(() => {
					this.props.navigation.goBack();
				});
			}
		);
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
