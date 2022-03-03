import React, { useCallback, useState } from 'react';
import { View, StyleSheet, InteractionManager, Text, LayoutAnimation } from 'react-native';
import { colors } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import ActionView from '../ActionView';
import AssetSearch from '../AssetSearch';
import AssetList from '../AssetList';
import Engine from '../../../core/Engine';
import AnalyticsV2 from '../../../util/analyticsV2';
import Alert, { AlertType } from '../../Base/Alert';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useSelector } from 'react-redux';
import { FORMATTED_NETWORK_NAMES } from '../../../constants/on-ramp';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
	},
	tokenDetectionBanner: { marginHorizontal: 20, marginTop: 20, paddingRight: 0 },
	tokenDetectionDescription: { color: colors.black },
	tokenDetectionLink: { color: colors.blue },
	tokenDetectionIcon: {
		paddingTop: 4,
		paddingRight: 8,
	},
});

interface Props {
	/**
	/* navigation object required to push new views
	*/
	navigation: any;
}

/**
 * Component that provides ability to add searched assets with metadata.
 */
const SearchTokenAutocomplete = ({ navigation }: Props) => {
	const [searchResults, setSearchResults] = useState([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedAsset, setSelectedAsset] = useState({});
	const [isSearchFocused, setIsSearchFocused] = useState(false);
	const { address, symbol, decimals } = selectedAsset as any;
	const isTokenDetectionEnabled = useSelector(
		(state: any) => !state.engine.backgroundState.PreferencesController.useStaticTokenList
	);
	const chainId = useSelector((state: any) => state.engine.backgroundState.NetworkController.provider.chainId);
	const networkType = useSelector((state: any) => state.engine.backgroundState.NetworkController.provider.type);

	const setFocusState = useCallback(
		(isFocused: boolean) => {
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
			setIsSearchFocused(isFocused);
		},
		[setIsSearchFocused]
	);

	const getAnalyticsParams = useCallback(() => {
		try {
			return {
				token_address: address,
				token_symbol: symbol,
				network_name: networkType,
				chain_id: chainId,
				source: 'Add token dropdown',
			};
		} catch (error) {
			return {};
		}
	}, [address, symbol, chainId, networkType]);

	const cancelAddToken = useCallback(() => {
		navigation.goBack();
	}, [navigation]);

	const handleSearch = useCallback(
		(opts: any) => {
			setSearchResults(opts.results);
			setSearchQuery(opts.searchQuery);
		},
		[setSearchResults, setSearchQuery]
	);

	const handleSelectAsset = useCallback(
		(asset) => {
			setSelectedAsset(asset);
		},
		[setSelectedAsset]
	);

	const addToken = useCallback(async () => {
		const { TokensController } = Engine.context as any;
		await TokensController.addToken(address, symbol, decimals);

		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.TOKEN_ADDED as any, getAnalyticsParams());

		// Clear state before closing
		setSearchResults([]);
		setSearchQuery('');
		setSelectedAsset({});

		InteractionManager.runAfterInteractions(() => {
			navigation.goBack();
		});
	}, [address, symbol, decimals, setSearchResults, setSearchQuery, setSelectedAsset, navigation, getAnalyticsParams]);

	const renderTokenDetectionBanner = useCallback(() => {
		if (isTokenDetectionEnabled || isSearchFocused) {
			return null;
		}
		return (
			<Alert
				type={AlertType.Info}
				style={styles.tokenDetectionBanner}
				renderIcon={() => (
					<FontAwesome
						style={styles.tokenDetectionIcon}
						name={'exclamation-circle'}
						color={colors.blue}
						size={18}
					/>
				)}
			>
				<>
					<Text style={styles.tokenDetectionDescription}>
						{strings('add_asset.token_detection_feature', { network: FORMATTED_NETWORK_NAMES[chainId] })}
					</Text>
					<Text
						suppressHighlighting
						onPress={() => {
							navigation.navigate('SettingsView', {
								screen: 'SecuritySettings',
								params: {
									isFullScreenModal: true,
								},
							});
						}}
						style={styles.tokenDetectionLink}
					>
						{strings('add_asset.token_detection_link')}
					</Text>
				</>
			</Alert>
		);
	}, [navigation, isSearchFocused, isTokenDetectionEnabled, chainId]);

	return (
		<View style={styles.wrapper} testID={'search-token-screen'}>
			<ActionView
				cancelText={strings('add_asset.tokens.cancel_add_token')}
				confirmText={strings('add_asset.tokens.add_token')}
				onCancelPress={cancelAddToken}
				onConfirmPress={addToken}
				confirmDisabled={!(address && symbol && decimals)}
			>
				<View>
					{renderTokenDetectionBanner()}
					<AssetSearch
						onSearch={handleSearch}
						onFocus={() => {
							setFocusState(true);
						}}
						onBlur={() => setFocusState(false)}
					/>
					<AssetList
						searchResults={searchResults}
						handleSelectAsset={handleSelectAsset}
						selectedAsset={selectedAsset}
						searchQuery={searchQuery}
					/>
				</View>
			</ActionView>
		</View>
	);
};

export default SearchTokenAutocomplete;
