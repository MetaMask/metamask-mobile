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
import Feather from 'react-native-vector-icons/Feather';
import CustomText from '../../../Base/Text';
import BaseListItem from '../../../Base/ListItem';
import ModalDragger from '../../../Base/ModalDragger';
import { Json } from '@metamask/controllers';
import { useFiatOnRampSDK } from '../SDK';

const Text = CustomText as any;
const ListItem = BaseListItem as any;

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
	//Unsure best way to implement this
	backButton: {
		right: 160,
		bottom: 24,
	},
	seperator: {
		height: 1,
		width: '100%',
		backgroundColor: colors.grey000,
	},
});

const MAX_REGION_RESULTS = 20;

function RegionModal(
	this: any,
	{ isVisible, dismiss, title, description, data, onItemPress, onRegionPress, excludeAddresses = [] }
) {
	const searchInput = useRef(null);
	const list = useRef();
	const [searchString, setSearchString] = useState('');
	const [activeScreen, setActiveScreen] = useState('country');
	const dataRef = useRef(data);
	const { selectedCountry } = useFiatOnRampSDK();
	const excludedAddresses = useMemo(
		() => excludeAddresses.filter(Boolean).map((address) => address.toLowerCase()),
		[excludeAddresses]
	);

	const filteredTokens = useMemo(
		() =>
			dataRef.current?.filter(
				(dat: { address: string }) => !excludedAddresses.includes(dat.address?.toLowerCase())
			),
		[dataRef, excludedAddresses]
	);

	const dataFuse = useMemo(
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
	const dataSearchResults = useMemo(
		() => (searchString.length > 0 ? dataFuse.search(searchString)?.slice(0, MAX_REGION_RESULTS) : filteredTokens),
		[searchString, dataFuse, filteredTokens]
	);

	const handleOnItemPressCallback = useCallback(
		(item) => {
			if (item.regions) {
				setActiveScreen('region');
				onItemPress(item);
				dataRef.current = item.regions;
				setSearchString('');
			} else {
				onItemPress(item);
				onRegionPress(item);
			}
		},
		[onItemPress, onRegionPress]
	);

	const renderItem = useCallback(
		({ item }) => (
			<TouchableOpacity onPress={() => handleOnItemPressCallback(item)}>
				<ListItem>
					<ListItem.Content>
						<ListItem.Body>
							<ListItem.Title>
								{item.emoji} {'   '}
								{item.name}
							</ListItem.Title>
						</ListItem.Body>
						{item.regions && (
							<ListItem.Amounts>
								<Text primary big>
									{' '}
									{'>'}
								</Text>
							</ListItem.Amounts>
						)}
					</ListItem.Content>
				</ListItem>
			</TouchableOpacity>
		),
		[handleOnItemPressCallback]
	);

	const handleSearchPress = () => searchInput?.current?.focus();

	const renderEmptyList = useMemo(
		() => (
			<View style={styles.emptyList}>
				<Text>{strings('fiat_on_ramp_aggregator.region.no_region_results', { searchString })}</Text>
			</View>
		),
		[searchString]
	);

	const handleRegionBackButton = () => {
		setActiveScreen('country');
		dataRef.current = data;
		setSearchString('');
	};

	const handleSearchTextChange = useCallback((text) => {
		setSearchString(text);
		if (list.current) list.current.scrollToOffset({ animated: false, y: 0 });
	}, []);

	const handleClearSearch = useCallback(() => {
		setSearchString('');
		searchInput?.current?.focus();
	}, [setSearchString]);

	const onModalHide = useCallback(() => {
		setActiveScreen('country');
		dataRef.current = data;
		setSearchString('');
	}, [setSearchString]);

	const separator = () => <View style={styles.seperator} />;

	return (
		<Modal
			isVisible={isVisible}
			onBackdropPress={dismiss}
			onBackButtonPress={dismiss}
			onSwipeComplete={dismiss}
			swipeDirection="down"
			propagateSwipe
			avoidKeyboard
			onModalHide={onModalHide}
			style={styles.modal}
		>
			<SafeAreaView style={styles.modalView}>
				<ModalDragger />
				{activeScreen === 'country' ? (
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
										placeholder={strings('fiat_on_ramp_aggregator.region.search_by_country')}
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
									data={dataSearchResults}
									renderItem={renderItem}
									keyExtractor={(item) => item.address}
									ListEmptyComponent={renderEmptyList}
									ItemSeparatorComponent={() => separator()}
									ListFooterComponent={() => separator()}
									ListHeaderComponent={() => separator()}
								/>
							</View>
						</ScreenLayout.Body>
					</ScreenLayout>
				) : (
					<ScreenLayout>
						<ScreenLayout.Header bold title={selectedCountry}>
							<TouchableOpacity onPress={handleRegionBackButton} style={styles.backButton}>
								<Feather name="chevron-left" size={20} color={colors.grey500} />
							</TouchableOpacity>

							<TouchableWithoutFeedback onPress={handleSearchPress}>
								<View style={styles.inputWrapper}>
									<Icon name="ios-search" size={20} style={styles.searchIcon} />
									<TextInput
										ref={searchInput}
										style={styles.input}
										placeholder={strings('fiat_on_ramp_aggregator.region.search_by_state')}
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
									keyboardDismissMode="none"
									keyboardShouldPersistTaps="always"
									data={dataSearchResults}
									renderItem={renderItem}
									keyExtractor={(item) => item.address}
									ListEmptyComponent={renderEmptyList}
									ItemSeparatorComponent={() => separator()}
									ListFooterComponent={() => separator()}
									ListHeaderComponent={() => separator()}
								/>
							</View>
						</ScreenLayout.Body>
					</ScreenLayout>
				)}
			</SafeAreaView>
		</Modal>
	);
}
//sdsdsds
RegionModal.propTypes = {
	isVisible: PropTypes.bool,
	dismiss: PropTypes.func,
	title: PropTypes.string,
	description: PropTypes.string,
	data: PropTypes.arrayOf(PropTypes.object),
	onItemPress: PropTypes.func,
	excludeAddresses: PropTypes.arrayOf(PropTypes.string),
};

const mapStateToProps = (state: {
	engine: {
		backgroundState: {
			AccountTrackerController: { accounts: any };
			CurrencyRateController: { conversionRate: any; currentCurrency: any };
			PreferencesController: { selectedAddress: any };
		};
	};
}) => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
});

export default connect(mapStateToProps)(RegionModal);
