import React, { memo, useEffect, useState, useCallback } from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import Fuse from 'fuse.js';
import Icon from 'react-native-vector-icons/FontAwesome';
import { toLowerCaseEquals } from '../../../util/general';
import { useSelector } from 'react-redux';
import { getTokenListArray } from '../../../reducers/tokens';
import { Token } from '@metamask/controllers';

const styles = StyleSheet.create({
	searchSection: {
		margin: 20,
		marginBottom: 0,
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderRadius: 4,
		borderColor: colors.grey100
	},
	textInput: {
		...fontStyles.normal
	} as StyleSheet.NamedStyles<any>,
	icon: {
		padding: 16
	}
});

const fuse = new Fuse<Token>([], {
	shouldSort: true,
	threshold: 0.45,
	location: 0,
	distance: 100,
	maxPatternLength: 32,
	minMatchCharLength: 1,
	keys: [{ name: 'name', weight: 0.5 }, { name: 'symbol', weight: 0.5 }]
});

type Props = {
	onSearch: ({ results, searchQuery }: { results: Token[]; searchQuery: string }) => void;
};

const AssetSearch = memo(({ onSearch }: Props) => {
	const [searchQuery, setSearchQuery] = useState('');
	const [inputWidth, setInputWidth] = useState('85%');
	const tokenList = useSelector(getTokenListArray);

	useEffect(() => {
		setTimeout(() => {
			setInputWidth('86%');
		}, 100);
	}, []);

	// Update fuse list
	useEffect(() => {
		// TODO: This gets filtered, how to handle with no erc20 field
		//.filter(tokenData => Boolean(tokenData.erc20));
		fuse.setCollection(tokenList);
	}, [tokenList]);

	const handleSearch = useCallback(
		(searchQuery: string) => {
			setSearchQuery(searchQuery);
			const fuseSearchResult = fuse.search(searchQuery);
			const addressSearchResult = tokenList.filter(token => toLowerCaseEquals(token.address, searchQuery));
			const results = [...addressSearchResult, ...fuseSearchResult];
			onSearch({ searchQuery, results });
		},
		[setSearchQuery, onSearch, tokenList]
	);

	return (
		<View style={styles.searchSection} testID={'add-searched-token-screen'}>
			<Icon name="search" size={22} style={styles.icon} />
			<TextInput
				style={[styles.textInput, { width: inputWidth }]}
				value={searchQuery}
				placeholder={strings('token.search_tokens_placeholder')}
				placeholderTextColor={colors.grey100}
				onChangeText={handleSearch}
				testID={'input-search-asset'}
			/>
		</View>
	);
});

export default AssetSearch;
