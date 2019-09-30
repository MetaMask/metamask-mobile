import React, { PureComponent } from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import contractMap from 'eth-contract-metadata';
import Fuse from 'fuse.js';
import Icon from 'react-native-vector-icons/FontAwesome';

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
		flex: 1,
		...fontStyles.normal
	},
	icon: {
		padding: 16
	}
});

const contractList = Object.entries(contractMap)
	.map(([address, tokenData]) => {
		tokenData.address = address;
		return tokenData;
	})
	.filter(tokenData => Boolean(tokenData.erc20));

const fuse = new Fuse(contractList, {
	shouldSort: true,
	threshold: 0.45,
	location: 0,
	distance: 100,
	maxPatternLength: 32,
	minMatchCharLength: 1,
	keys: [{ name: 'name', weight: 0.5 }, { name: 'symbol', weight: 0.5 }]
});

/**
 * PureComponent that provides ability to search assets.
 */
export default class AssetSearch extends PureComponent {
	state = {
		searchQuery: ''
	};

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		onSearch: PropTypes.func
	};

	handleSearch = searchQuery => {
		this.setState({ searchQuery });
		const fuseSearchResult = fuse.search(searchQuery);
		const addressSearchResult = contractList.filter(
			token => token.address.toLowerCase() === searchQuery.toLowerCase()
		);
		const results = [...addressSearchResult, ...fuseSearchResult];
		this.props.onSearch({ searchQuery, results });
	};

	render = () => {
		const { searchQuery } = this.state;

		return (
			<View style={styles.searchSection} testID={'add-searched-token-screen'}>
				<Icon name="search" size={22} style={styles.icon} />
				<TextInput
					style={styles.textInput}
					value={searchQuery}
					placeholder={strings('token.search_tokens_placeholder')}
					placeholderTextColor={colors.grey100}
					onChangeText={this.handleSearch}
					testID={'input-search-asset'}
				/>
			</View>
		);
	};
}
