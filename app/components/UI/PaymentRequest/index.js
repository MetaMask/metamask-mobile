import React, { Component } from 'react';
import { Platform, SafeAreaView, TextInput, Text, StyleSheet, ScrollView, View } from 'react-native';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../../styles/common';
import { getPaymentRequestOptionsTitle } from '../../UI/Navbar';
import FeatherIcon from 'react-native-vector-icons/Feather';
import contractMap from 'eth-contract-metadata';
import Fuse from 'fuse.js';
import AssetList from './AssetList';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	contentWrapper: {
		padding: 20
	},
	title: {
		...fontStyles.bold,
		fontSize: 16
	},
	searchWrapper: {
		marginTop: 12,
		marginBottom: 24
	},
	searchInput: {
		flex: 1,
		marginHorizontal: 0,
		paddingTop: Platform.OS === 'android' ? 12 : 2,
		borderRadius: 20,
		paddingHorizontal: 38,
		fontSize: 16,
		backgroundColor: colors.grey000,
		height: 40,
		color: colors.grey400,
		...fontStyles.normal
	},
	searchIcon: {
		position: 'absolute',
		textAlignVertical: 'center',
		marginTop: Platform.OS === 'android' ? 9 : 10,
		marginLeft: 12
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

const ethLogo = require('../../../images/eth-logo.png'); // eslint-disable-line

const defaultAssets = [
	{
		symbol: 'ETH',
		name: 'Ether',
		logo: ethLogo
	},
	{
		address: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
		decimals: 18,
		erc20: true,
		logo: 'dai.svg',
		name: 'Dai Stablecoin v1.0',
		symbol: 'DAI'
	}
];

/**
 * Main view for general app configurations
 */
class PaymentRequest extends Component {
	static navigationOptions = ({ navigation }) => getPaymentRequestOptionsTitle('Request', navigation);

	state = {
		searchInputValue: '',
		results: [],
		selectedAsset: undefined
	};

	handleSearch = searchInputValue => {
		const fuseSearchResult = fuse.search(searchInputValue);
		const addressSearchResult = contractList.filter(
			token => token.address.toLowerCase() === searchInputValue.toLowerCase()
		);
		const results = [...addressSearchResult, ...fuseSearchResult];
		this.setState({ searchInputValue, results });
	};

	handleSelectAsset = () => {
		//
	};

	renderSelectAssets() {
		const results = this.state.results.length ? this.state.results : defaultAssets;
		return (
			<View>
				<View>
					<Text style={styles.title}>Choose an asset to request</Text>
				</View>
				<View style={styles.searchWrapper}>
					<TextInput
						style={[styles.searchInput, this.state.inputWidth ? { width: this.state.inputWidth } : {}]}
						autoCapitalize="none"
						autoCorrect={false}
						clearButtonMode="while-editing"
						onChangeText={this.handleSearch}
						onSubmitEditing={this.handleSearch}
						placeholder={'Search assets'}
						placeholderTextColor={colors.grey400}
						returnKeyType="go"
						value={this.state.searchInputValue}
						blurOnSubmit
					/>
					<FeatherIcon
						onPress={this.focusInput}
						name="search"
						size={18}
						color={colors.grey400}
						style={styles.searchIcon}
					/>
				</View>
				<AssetList
					searchResults={results}
					handleSelectAsset={this.handleSelectAsset}
					selectedAsset={this.state.selectedAsset}
					searchQuery={this.state.searchInputValue}
				/>
			</View>
		);
	}

	render() {
		return (
			<SafeAreaView style={styles.wrapper}>
				<ScrollView style={styles.contentWrapper}>{this.renderSelectAssets()}</ScrollView>
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	searchEngine: state.settings.searchEngine,
	primaryCurrency: state.settings.primaryCurrency
});

export default connect(mapStateToProps)(PaymentRequest);
