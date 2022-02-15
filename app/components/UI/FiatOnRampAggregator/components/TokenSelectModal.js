import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
	StyleSheet,
	TextInput,
	SafeAreaView,
	TouchableOpacity,
	View,
	TouchableWithoutFeedback,
	ActivityIndicator,
	InteractionManager,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/Ionicons';
import Fuse from 'fuse.js';
import { connect } from 'react-redux';
import { isValidAddress } from 'ethereumjs-util';

import Device from '../../../../util/device';
import { strings } from '../../../../../locales/i18n';
import { colors, fontStyles } from '../../../../styles/common';
import ScreenLayout from './ScreenLayout';

import Text from '../../../Base/Text';
import ListItem from '../../../Base/ListItem';
import ModalDragger from '../../../Base/ModalDragger';
import TokenIcon from '../../Swaps/components/TokenIcon';
import useBlockExplorer from '../../Swaps/utils/useBlockExplorer';
import useFetchTokenMetadata from '../../Swaps/utils/useFetchTokenMetadata';
import useModalHandler from '../../../Base/hooks/useModalHandler';
import TokenImportModal from '../../Swaps/components/TokenImportModal';
import Analytics from '../../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../../util/analytics';

const styles = StyleSheet.create({
	modal: {
		margin: 0,
		justifyContent: 'flex-end',
	},
	modalView: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		flex: 0.75,
	},
	inputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 24,
		marginTop: 10,
		paddingVertical: Device.isAndroid() ? 0 : 10,
		paddingHorizontal: 5,
		borderRadius: 5,
		borderWidth: 1,
		borderColor: colors.grey100,
	},
	searchIcon: {
		marginHorizontal: 8,
	},
	input: {
		...fontStyles.normal,
		flex: 1,
	},
	headerDescription: {
		paddingHorizontal: 24,
	},
	resultsView: {
		height: Device.isSmallDevice() ? 200 : 280,
		marginTop: 0,
	},
	resultRow: {
		borderTopWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100,
	},
	emptyList: {
		marginVertical: 10,
		marginHorizontal: 30,
	},
	importButton: {
		paddingVertical: 6,
		paddingHorizontal: 10,
		backgroundColor: colors.blue,
		borderRadius: 100,
	},
	importButtonText: {
		color: colors.white,
	},
	loadingIndicator: {
		margin: 10,
	},
	loadingTokenView: {
		marginVertical: 10,
		marginHorizontal: 30,
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'row',
	},
	networkLabel: {
		backgroundColor: colors.grey500,
		paddingVertical: 5,
		borderRadius: 5,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
	},
	networkLabelText: {
		fontSize: 10,
		color: colors.white,
	},
	listItem: {
		paddingHorizontal: 24,
	},
	symbolName: {
		paddingRight: 15,
	},
});

const MAX_TOKENS_RESULTS = 20;

function TokenSelectModal({
	isVisible,
	dismiss,
	title,
	description,
	tokens,
	onItemPress,
	excludeAddresses = [],
	accounts,
	selectedAddress,
	currentCurrency,
	conversionRate,
	tokenExchangeRates,
	chainId,
	provider,
	frequentRpcList,
	balances,
}) {
	const navigation = useNavigation();
	const searchInput = useRef(null);
	const list = useRef();
	const [searchString, setSearchString] = useState('');
	const explorer = useBlockExplorer(provider, frequentRpcList);
	const [isTokenImportVisible, , showTokenImportModal, hideTokenImportModal] = useModalHandler(false);

	const excludedAddresses = useMemo(
		() => excludeAddresses.filter(Boolean).map((address) => address.toLowerCase()),
		[excludeAddresses]
	);

	const filteredTokens = useMemo(
		() => tokens?.filter((token) => !excludedAddresses.includes(token.address?.toLowerCase())),
		[tokens, excludedAddresses]
	);

	const tokenFuse = useMemo(
		() =>
			new Fuse(filteredTokens, {
				shouldSort: true,
				threshold: 0.45,
				location: 0,
				distance: 100,
				maxPatternLength: 32,
				minMatchCharLength: 1,
				keys: ['symbol', 'address', 'name'],
			}),
		[filteredTokens]
	);
	const tokenSearchResults = useMemo(
		() => (searchString.length > 0 ? tokenFuse.search(searchString)?.slice(0, MAX_TOKENS_RESULTS) : filteredTokens),
		[searchString, tokenFuse, filteredTokens]
	);

	const shouldFetchToken = useMemo(
		() =>
			tokenSearchResults.length === 0 &&
			isValidAddress(searchString) &&
			!excludedAddresses.includes(searchString?.toLowerCase()),
		[excludedAddresses, searchString, tokenSearchResults.length]
	);

	const [loadingTokenMetadata, tokenMetadata] = useFetchTokenMetadata(
		shouldFetchToken ? searchString : null,
		chainId
	);

	const renderItem = useCallback(
		({ item }) => (
			<TouchableOpacity onPress={() => onItemPress(item)}>
				<ListItem style={styles.listItem}>
					<ListItem.Content>
						<ListItem.Icon>
							<TokenIcon medium icon={item.iconUrl} symbol={item.symbol} />
						</ListItem.Icon>
						<ListItem.Body>
							<ListItem.Title>{item.symbol}</ListItem.Title>
							{item.name && <Text style={styles.symbolName}>{item.name}</Text>}
						</ListItem.Body>
						<ListItem.Amounts style={styles.networkLabel}>
							<ListItem.Amount>
								<Text bold style={styles.networkLabelText}>
									{item.network?.toUpperCase()}
								</Text>
							</ListItem.Amount>
						</ListItem.Amounts>
					</ListItem.Content>
				</ListItem>
			</TouchableOpacity>
		),
		[onItemPress]
	);

	const handleSearchPress = () => searchInput?.current?.focus();

	const handleShowImportToken = useCallback(() => {
		searchInput?.current?.blur();
		showTokenImportModal();
	}, [showTokenImportModal]);

	const handlePressImportToken = useCallback(
		(item) => {
			const { address, symbol } = item;
			InteractionManager.runAfterInteractions(() => {
				Analytics.trackEventWithParameters(
					ANALYTICS_EVENT_OPTS.CUSTOM_TOKEN_IMPORTED,
					{ address, symbol, chain_id: chainId },
					true
				);
			});
			hideTokenImportModal();
			onItemPress(item);
		},
		[chainId, hideTokenImportModal, onItemPress]
	);

	const handleBlockExplorerPress = useCallback(() => {
		navigation.navigate('Webview', {
			screen: 'SimpleWebview',
			params: {
				url: shouldFetchToken ? explorer.token(searchString) : explorer.token('').replace('token/', 'tokens/'),
				title: strings(shouldFetchToken ? 'swaps.verify' : 'swaps.find_token_address'),
			},
		});
		dismiss();
	}, [dismiss, explorer, navigation, searchString, shouldFetchToken]);

	const renderEmptyList = useMemo(
		() => (
			<View style={styles.emptyList}>
				<Text>{strings('swaps.no_tokens_result', { searchString })}</Text>
			</View>
		),
		[searchString]
	);

	const handleSearchTextChange = useCallback((text) => {
		setSearchString(text);
		if (list.current) list.current.scrollToOffset({ animated: false, y: 0 });
	}, []);

	const handleClearSearch = useCallback(() => {
		setSearchString('');
		searchInput?.current?.focus();
	}, [setSearchString]);

	return (
		<Modal
			isVisible={isVisible}
			onBackdropPress={dismiss}
			onBackButtonPress={dismiss}
			onSwipeComplete={dismiss}
			swipeDirection="down"
			propagateSwipe
			avoidKeyboard
			onModalHide={() => setSearchString('')}
			style={styles.modal}
		>
			<SafeAreaView style={styles.modalView}>
				<ModalDragger />
				<ScreenLayout>
					<ScreenLayout.Header
						bold
						title={title}
						description={description}
						descriptionStyle={styles.headerDescription}
					>
						<TouchableWithoutFeedback onPress={handleSearchPress}>
							<View style={styles.inputWrapper}>
								<Icon name="ios-search" size={20} style={styles.searchIcon} />
								<TextInput
									ref={searchInput}
									style={styles.input}
									placeholder={strings('fiat_on_ramp_aggregator.search_by_cryptocurrency')}
									placeholderTextColor={colors.grey500}
									value={searchString}
									onChangeText={handleSearchTextChange}
								/>
								{searchString.length > 0 && (
									<TouchableOpacity onPress={handleClearSearch}>
										<Icon
											name="ios-close-circle"
											size={20}
											style={styles.searchIcon}
											color={colors.grey300}
										/>
									</TouchableOpacity>
								)}
							</View>
						</TouchableWithoutFeedback>
					</ScreenLayout.Header>

					<ScreenLayout.Body>
						{shouldFetchToken ? (
							<View style={styles.resultsView}>
								{loadingTokenMetadata ? (
									<View style={styles.loadingTokenView}>
										<ActivityIndicator style={styles.loadingIndicator} />
										<Text>{strings('swaps.gathering_token_details')}</Text>
									</View>
								) : tokenMetadata.error ? (
									<View style={styles.emptyList}>
										<Text>{strings('swaps.error_gathering_token_details')}</Text>
									</View>
								) : tokenMetadata.valid ? (
									<View style={styles.resultRow}>
										<ListItem>
											<ListItem.Content>
												<ListItem.Icon>
													<TokenIcon
														medium
														icon={tokenMetadata.metadata.iconUrl}
														symbol={tokenMetadata.metadata.symbol}
													/>
												</ListItem.Icon>
												<ListItem.Body>
													<ListItem.Title>{tokenMetadata.metadata.symbol}</ListItem.Title>
													{tokenMetadata.metadata.name && (
														<Text>{tokenMetadata.metadata.name}</Text>
													)}
												</ListItem.Body>
												<ListItem.Amounts>
													<TouchableOpacity
														style={styles.importButton}
														onPress={handleShowImportToken}
													>
														<Text small style={styles.importButtonText}>
															{strings('swaps.Import')}
														</Text>
													</TouchableOpacity>
												</ListItem.Amounts>
											</ListItem.Content>
										</ListItem>
										<TokenImportModal
											isVisible={isTokenImportVisible}
											dismiss={hideTokenImportModal}
											token={tokenMetadata.metadata}
											onPressImport={() => handlePressImportToken(tokenMetadata.metadata)}
										/>
									</View>
								) : (
									<View style={styles.emptyList}>
										<Text>
											{strings('swaps.invalid_token_contract_address')}
											{explorer.isValid && (
												<Text reset>
													{` ${strings('swaps.please_verify_on_explorer')} `}
													<Text reset link underline onPress={handleBlockExplorerPress}>
														{explorer.name}
													</Text>
													.
												</Text>
											)}
										</Text>
									</View>
								)}
							</View>
						) : (
							<FlatList
								ref={list}
								style={styles.resultsView}
								keyboardDismissMode="none"
								keyboardShouldPersistTaps="always"
								data={tokenSearchResults}
								renderItem={renderItem}
								keyExtractor={(item) => item.address}
								ListEmptyComponent={renderEmptyList}
							/>
						)}
					</ScreenLayout.Body>
				</ScreenLayout>
			</SafeAreaView>
		</Modal>
	);
}

TokenSelectModal.propTypes = {
	isVisible: PropTypes.bool,
	dismiss: PropTypes.func,
	title: PropTypes.string,
	description: PropTypes.string,
	tokens: PropTypes.arrayOf(PropTypes.object),
	onItemPress: PropTypes.func,
	excludeAddresses: PropTypes.arrayOf(PropTypes.string),
	/**
	 * ETH to current currency conversion rate
	 */
	conversionRate: PropTypes.number,
	/**
	 * Map of accounts to information objects including balances
	 */
	accounts: PropTypes.object,
	/**
	 * Currency code of the currently-active currency
	 */
	currentCurrency: PropTypes.string,
	/**
	 * A string that represents the selected address
	 */
	selectedAddress: PropTypes.string,
	/**
	 * An object containing token balances for current account and network in the format address => balance
	 */
	balances: PropTypes.object,
	/**
	 * An object containing token exchange rates in the format address => exchangeRate
	 */
	tokenExchangeRates: PropTypes.object,
	/**
	 * Chain Id
	 */
	chainId: PropTypes.string,
	/**
	 * Current Network provider
	 */
	provider: PropTypes.object,
	/**
	 * Frequent RPC list from PreferencesController
	 */
	frequentRpcList: PropTypes.array,
};

const mapStateToProps = (state) => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	balances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	tokenExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	provider: state.engine.backgroundState.NetworkController.provider,
	frequentRpcList: state.engine.backgroundState.PreferencesController.frequentRpcList,
});

export default connect(mapStateToProps)(TokenSelectModal);
