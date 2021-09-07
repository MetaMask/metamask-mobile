import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
	FlatList,
	SafeAreaView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View,
} from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/Ionicons';
import Fuse from 'fuse.js';

import Device from '../../../../util/device';
import { strings } from '../../../../../locales/i18n';

import Text from '../../../Base/Text';
import ListItem from '../../../Base/ListItem';
import ModalDragger from '../../../Base/ModalDragger';
import { colors, fontStyles } from '../../../../styles/common';

const styles = StyleSheet.create({
	modal: {
		margin: 0,
		justifyContent: 'flex-end',
	},
	modalView: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
	},
	inputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 30,
		marginVertical: 10,
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
	modalTitle: {
		marginTop: Device.isIphone5() ? 10 : 15,
		marginBottom: Device.isIphone5() ? 5 : 5,
		marginHorizontal: 36,
	},
	resultsView: {
		height: Device.isSmallDevice() ? 130 : 250,
		marginTop: 10,
	},
	resultRow: {
		borderTopWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100,
		paddingHorizontal: 20,
	},
	flag: {
		fontSize: 24,
	},
	emptyList: {
		marginVertical: 10,
		marginHorizontal: 30,
	},
});

function CountrySelectorModal({ isVisible, dismiss, countries, onItemPress }) {
	const searchInput = useRef(null);
	const list = useRef();
	const [searchString, setSearchString] = useState('');

	const countriesFuse = useMemo(
		() =>
			new Fuse(countries, {
				shouldSort: true,
				threshold: 0.45,
				location: 0,
				distance: 100,
				maxPatternLength: 32,
				minMatchCharLength: 1,
				keys: ['name', 'currency', 'code', 'label'],
			}),
		[countries]
	);

	const countriesSearchResults = useMemo(
		() => (searchString.length > 0 ? countriesFuse.search(searchString) : countries),
		[searchString, countriesFuse, countries]
	);

	const handleSearchPress = () => searchInput?.current?.focus();

	const handleSearchTextChange = useCallback((text) => {
		setSearchString(text);
		if (list.current) list.current.scrollToOffset({ animated: false, y: 0 });
	}, []);

	const renderItem = useCallback(
		({ item }) => (
			<TouchableOpacity style={styles.resultRow} onPress={() => onItemPress(item.code)}>
				<ListItem>
					<ListItem.Content>
						<ListItem.Icon>
							<Text style={styles.flag}>{item.label}</Text>
						</ListItem.Icon>
						<ListItem.Body>
							<ListItem.Title>{item.name}</ListItem.Title>
						</ListItem.Body>
					</ListItem.Content>
				</ListItem>
			</TouchableOpacity>
		),
		[onItemPress]
	);

	const renderEmptyList = useMemo(
		() => (
			<View style={styles.emptyList}>
				<Text>{strings('fiat_on_ramp.no_countries_result', { searchString })}</Text>
			</View>
		),
		[searchString]
	);

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
				<View style={styles.modalTitle}>
					<Text bold centered primary>
						{strings('fiat_on_ramp.supported_countries')}
					</Text>
					<Text centered small>
						{strings('fiat_on_ramp.select_card_country')}
					</Text>
				</View>
				<TouchableWithoutFeedback onPress={handleSearchPress}>
					<View style={styles.inputWrapper}>
						<Icon name="ios-search" size={20} style={styles.searchIcon} />
						<TextInput
							ref={searchInput}
							style={styles.input}
							placeholder={strings('fiat_on_ramp.search_country')}
							placeholderTextColor={colors.grey500}
							value={searchString}
							onChangeText={handleSearchTextChange}
						/>
					</View>
				</TouchableWithoutFeedback>
				<FlatList
					ref={list}
					style={styles.resultsView}
					keyboardDismissMode="none"
					keyboardShouldPersistTaps="always"
					data={countriesSearchResults}
					renderItem={renderItem}
					keyExtractor={(item) => item.code}
					ListEmptyComponent={renderEmptyList}
				/>
			</SafeAreaView>
		</Modal>
	);
}

CountrySelectorModal.propTypes = {
	isVisible: PropTypes.bool,
	dismiss: PropTypes.func,
	countries: PropTypes.array,
	onItemPress: PropTypes.func,
};

export default CountrySelectorModal;
