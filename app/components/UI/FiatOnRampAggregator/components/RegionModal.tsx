import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, SafeAreaView, TouchableOpacity, View, TouchableWithoutFeedback } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/Ionicons';
import Fuse from 'fuse.js';
import Device from '../../../../util/device';
import { strings } from '../../../../../locales/i18n';
import { colors, fontStyles } from '../../../../styles/common';
import ScreenLayout from './ScreenLayout';
import Feather from 'react-native-vector-icons/Feather';
import CustomText from '../../../Base/Text';
import BaseListItem from '../../../Base/ListItem';
import ModalDragger from '../../../Base/ModalDragger';
import { useFiatOnRampSDK } from '../sdk';

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
		color: colors.grey500,
		flex: 1,
	},
	headerDescription: {
		paddingHorizontal: 24,
	},
	resultsView: {
		marginTop: 0,
		flex: 1,
	},
	rowView: {
		paddingHorizontal: 0,
	},
	emptyList: {
		marginVertical: 10,
		marginHorizontal: 30,
	},
	separator: {
		height: 1,
		width: '100%',
		backgroundColor: colors.grey000,
	},
	subheader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		width: '100%',
		paddingVertical: 10,
	},
	ghostSpacer: {
		width: 20,
	},
	listItem: {
		paddingHorizontal: 24,
	},
	region: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	emoji: {
		paddingRight: 16,
	},
});

const Separator = () => <View style={styles.separator} />;
const MAX_REGION_RESULTS = 20;

interface Props {
	isVisible?: boolean;
	title?: string;
	description?: string;
	dismiss?: () => any;
	data?: [JSON];
	onCountryPress: (arg0: JSON) => any;
	onRegionPress: (arg0: JSON) => any;
}

const RegionModal: React.FC<Props> = ({
	isVisible,
	title,
	description,
	data,
	onCountryPress,
	onRegionPress,
	dismiss,
}: Props) => {
	const searchInput = useRef(null);
	const list = useRef();
	const [searchString, setSearchString] = useState('');
	const [activeScreen, setActiveScreen] = useState('country');
	const [selectedCountryName, setSelectedCountryName] = useState('');
	const dataRef = useRef(data);
	const { setSelectedCountry } = useFiatOnRampSDK();

	const dataFuse = useMemo(
		() =>
			new Fuse(dataRef.current as [JSON], {
				shouldSort: true,
				threshold: 0.45,
				location: 0,
				distance: 100,
				maxPatternLength: 32,
				minMatchCharLength: 1,
				keys: ['symbol', 'address', 'name'],
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[dataRef.current]
	);
	const dataSearchResults = useMemo(
		() => (searchString.length > 0 ? dataFuse.search(searchString)?.slice(0, MAX_REGION_RESULTS) : dataRef.current),
		[searchString, dataFuse]
	);

	const handleOnItemPressCallback = useCallback(
		(item) => {
			//it is a region
			if (!item.currency) {
				onRegionPress(item);
			}
			//it is a country that has regions
			else if (item.regions) {
				setActiveScreen('region');
				dataRef.current = item.regions;
				setSearchString('');
				setSelectedCountry(item.id);
				setSelectedCountryName(item.name);
			}
			//it is a country with no regions
			else {
				onCountryPress(item);
			}
		},
		[onCountryPress, onRegionPress, setSelectedCountry]
	);

	const renderItem = useCallback(
		({ item }) => (
			<TouchableOpacity onPress={() => handleOnItemPressCallback(item)}>
				<ListItem style={styles.listItem}>
					<ListItem.Content>
						<ListItem.Body>
							<View style={styles.region}>
								<View style={styles.emoji}>
									<Text>{item.emoji}</Text>
								</View>
								<View>
									<Text black>{item.name}</Text>
								</View>
							</View>
						</ListItem.Body>
						{item.regions && (
							<ListItem.Amounts>
								<Text primary big>
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
				<Text>
					{strings('fiat_on_ramp_aggregator.region.no_region_results', {
						searchString,
					})}
				</Text>
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
	}, [data]);

	return (
		<Modal
			isVisible={isVisible}
			onBackdropPress={dismiss}
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
										style={styles.input as any}
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
									ref={list as any}
									style={styles.rowView}
									keyboardDismissMode="none"
									keyboardShouldPersistTaps="always"
									data={dataSearchResults}
									renderItem={renderItem}
									keyExtractor={(item) => item.id}
									ListEmptyComponent={renderEmptyList}
									ItemSeparatorComponent={Separator}
									ListFooterComponent={Separator}
									ListHeaderComponent={Separator}
								/>
							</View>
						</ScreenLayout.Body>
					</ScreenLayout>
				) : (
					<ScreenLayout>
						<ScreenLayout.Header>
							<ScreenLayout.Content style={styles.subheader}>
								<TouchableOpacity onPress={handleRegionBackButton}>
									<Feather name="chevron-left" size={22} color={colors.grey500} />
								</TouchableOpacity>
								<Text bold black>
									{selectedCountryName}
								</Text>
								<View style={styles.ghostSpacer} />
							</ScreenLayout.Content>
							<TouchableWithoutFeedback onPress={handleSearchPress}>
								<View style={styles.inputWrapper}>
									<Icon name="ios-search" size={20} style={styles.searchIcon} />
									<TextInput
										ref={searchInput}
										style={styles.input as any}
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
									style={styles.rowView}
									keyboardShouldPersistTaps="always"
									data={dataSearchResults}
									renderItem={renderItem}
									keyExtractor={(item) => item.id}
									ListEmptyComponent={renderEmptyList}
									ItemSeparatorComponent={Separator}
									ListFooterComponent={Separator}
									ListHeaderComponent={Separator}
								/>
							</View>
						</ScreenLayout.Body>
					</ScreenLayout>
				)}
			</SafeAreaView>
		</Modal>
	);
};

export default RegionModal;
