import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, TextInput, SafeAreaView, TouchableOpacity, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/Ionicons';
import Fuse from 'fuse.js';
import Device from '../../../../util/Device';
import { colors, fontStyles } from '../../../../styles/common';

import Text from '../../../Base/Text';
import ListItem from '../../../Base/ListItem';
import ModalDragger from '../../../Base/ModalDragger';
import TokenIcon from './TokenIcon';

const styles = StyleSheet.create({
	modal: {
		margin: 0,
		justifyContent: 'flex-end'
	},
	modalView: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10
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
		borderColor: colors.grey100
	},
	searchIcon: {
		marginHorizontal: 8
	},
	input: {
		...fontStyles.normal,
		flex: 1
	},
	modalTitle: {
		marginTop: Device.isIphone5() ? 10 : 15,
		marginBottom: Device.isIphone5() ? 5 : 5
	},
	resultsView: {
		height: Device.isSmallDevice() ? 200 : 280,
		marginTop: 10,
		borderTopWidth: 1,
		borderTopColor: colors.grey100
	},
	resultRow: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100
	}
});

function TokenSelectModal({ isVisible, dismiss, title, tokens, onItemPress, exclude = [] }) {
	const searchInput = useRef(null);
	const [searchString, setSearchString] = useState('');

	const filteredTokens = useMemo(() => tokens.filter(token => !exclude.includes(token.symbol)), [tokens, exclude]);
	const tokenFuse = useMemo(
		() =>
			new Fuse(filteredTokens, {
				shouldSort: true,
				threshold: 0.45,
				location: 0,
				distance: 100,
				maxPatternLength: 32,
				minMatchCharLength: 1,
				keys: [{ name: 'name', weight: 0.5 }, { name: 'symbol', weight: 0.5 }, { name: 'address', weight: 0.5 }]
			}),
		[filteredTokens]
	);
	const tokenSearchResults = useMemo(
		() => (searchString.length > 0 ? tokenFuse.search(searchString) : filteredTokens).slice(0, 5),
		[searchString, tokenFuse, filteredTokens]
	);

	const renderItem = useCallback(
		({ item }) => (
			<TouchableOpacity
				style={styles.resultRow}
				onPress={() => {
					setSearchString('');
					onItemPress(item);
				}}
			>
				<ListItem>
					<ListItem.Content>
						<ListItem.Icon>
							<TokenIcon medium icon={item.iconUrl} symbol={item.symbol} />
						</ListItem.Icon>
						<ListItem.Body>
							<ListItem.Title>{item.symbol}</ListItem.Title>
						</ListItem.Body>
						<ListItem.Amounts>
							<ListItem.Amount>...</ListItem.Amount>
							<ListItem.FiatAmount>...</ListItem.FiatAmount>
						</ListItem.Amounts>
					</ListItem.Content>
				</ListItem>
			</TouchableOpacity>
		),
		[onItemPress, setSearchString]
	);

	const handleSearchPress = () => searchInput?.current?.focus();

	return (
		<Modal
			isVisible={isVisible}
			onBackdropPress={dismiss}
			onBackButtonPress={dismiss}
			onSwipeComplete={dismiss}
			swipeDirection="down"
			propagateSwipe
			avoidKeyboard
			style={styles.modal}
		>
			<SafeAreaView style={styles.modalView}>
				<ModalDragger />
				<Text bold centered primary style={styles.modalTitle}>
					{title}
				</Text>
				<View style={styles.inputWrapper}>
					<Icon name="ios-search" size={20} style={styles.searchIcon} onPress={handleSearchPress} />
					<TextInput
						ref={searchInput}
						style={styles.input}
						placeholder="Search for a token…"
						placeholderTextColor={colors.grey500}
						value={searchString}
						onChangeText={setSearchString}
					/>
				</View>
				<FlatList
					style={styles.resultsView}
					keyboardDismissMode="none"
					keyboardShouldPersistTaps="always"
					data={tokenSearchResults}
					renderItem={renderItem}
					keyExtractor={item => item.address}
				/>
			</SafeAreaView>
		</Modal>
	);
}

TokenSelectModal.propTypes = {
	isVisible: PropTypes.bool,
	dismiss: PropTypes.func,
	title: PropTypes.string,
	tokens: PropTypes.arrayOf(PropTypes.object),
	onItemPress: PropTypes.func,
	exclude: PropTypes.arrayOf(PropTypes.string)
};

export default TokenSelectModal;
