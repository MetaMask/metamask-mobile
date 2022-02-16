import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, TextInput, SafeAreaView, TouchableOpacity, View, TouchableWithoutFeedback } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/Ionicons';
import Fuse from 'fuse.js';
import { connect } from 'react-redux';
import Device from '../../../../util/device';
import { strings } from '../../../../../locales/i18n';
import { colors, fontStyles } from '../../../../styles/common';
import ScreenLayout from './ScreenLayout';

import Text from '../../../Base/Text';
import ListItem from '../../../Base/ListItem';
import ModalDragger from '../../../Base/ModalDragger';
import TokenIcon from '../../Swaps/components/TokenIcon';

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
		marginTop: 0,
		flex: 1,
	},
	emptyList: {
		marginVertical: 10,
		marginHorizontal: 30,
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

function TokenSelectModal({ isVisible, dismiss, title, description, tokens, onItemPress, excludeAddresses = [] }) {
	const searchInput = useRef(null);
	const list = useRef();
	const [searchString, setSearchString] = useState('');

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
						<View style={styles.resultsView}>
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
						</View>
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
};

const mapStateToProps = (state) => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
});

export default connect(mapStateToProps)(TokenSelectModal);
