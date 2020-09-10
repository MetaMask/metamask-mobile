import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { StyleSheet, Text, ScrollView, View } from 'react-native';
import { connect } from 'react-redux';

import Engine from '../../../../core/Engine';
import I18n, { strings, getLanguages, setLocale } from '../../../../../locales/i18n';
import SelectComponent from '../../../UI/SelectComponent';
import infuraCurrencies from '../../../../util/infura-conversion.json';
import { colors, fontStyles } from '../../../../styles/common';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { setSearchEngine, setPrimaryCurrency } from '../../../../actions/settings';
import PickComponent from '../../PickComponent';

const sortedCurrencies = infuraCurrencies.objects
	.map((value, index) =>
		Object.assign({}, value, {
			base: {
				code: 'eth',
				name: 'Ethereum'
			}
		})
	)
	.sort((a, b) => a.quote.code.toLocaleLowerCase().localeCompare(b.quote.code.toLocaleLowerCase()));

const infuraCurrencyOptions = sortedCurrencies.map(({ quote: { code, name } }) => ({
	label: `${code.toUpperCase()} - ${name}`,
	key: code,
	value: code
}));

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		padding: 24,
		zIndex: 99999999999999
	},
	title: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		fontSize: 20,
		lineHeight: 20
	},
	desc: {
		...fontStyles.normal,
		color: colors.grey500,
		fontSize: 14,
		lineHeight: 20,
		marginTop: 12
	},
	picker: {
		borderColor: colors.grey200,
		borderRadius: 5,
		borderWidth: 2,
		marginTop: 16
	},
	simplePicker: {
		marginTop: 16
	},
	setting: {
		marginTop: 50
	},
	firstSetting: {
		marginTop: 0
	},
	inner: {
		paddingBottom: 48
	}
});

/**
 * Main view for general app configurations
 */
class Settings extends PureComponent {
	static propTypes = {
		/**
		/* State current currency
		*/
		currentCurrency: PropTypes.string,
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * Called to set the active search engine
		 */
		setSearchEngine: PropTypes.func,
		/**
		 * Called to set primary currency
		 */
		setPrimaryCurrency: PropTypes.func,
		/**
		 * Active search engine
		 */
		searchEngine: PropTypes.string,
		/**
		 * Active primary currency
		 */
		primaryCurrency: PropTypes.string
	};

	static navigationOptions = ({ navigation }) =>
		getNavigationOptionsTitle(strings('app_settings.general_title'), navigation);

	state = {
		currentLanguage: I18n.locale.substr(0, 2),
		languages: {}
	};

	selectCurrency = async currency => {
		const { CurrencyRateController } = Engine.context;
		CurrencyRateController.configure({ currentCurrency: currency });
	};

	selectLanguage = language => {
		if (language === this.state.currentLanguage) return;
		setLocale(language);
		this.setState({ currentLanguage: language });
		setTimeout(() => this.props.navigation.navigate('Home'), 100);
	};

	selectSearchEngine = searchEngine => {
		this.props.setSearchEngine(searchEngine);
	};

	selectPrimaryCurrency = primaryCurrency => {
		this.props.setPrimaryCurrency(primaryCurrency);
	};

	componentDidMount = () => {
		const languages = getLanguages();
		this.setState({ languages });
		this.languageOptions = Object.keys(languages).map(key => ({ value: key, label: languages[key], key }));
		this.searchEngineOptions = [
			{ value: 'DuckDuckGo', label: 'DuckDuckGo', key: 'DuckDuckGo' },
			{ value: 'Google', label: 'Google', key: 'Google' }
		];
		this.primaryCurrencyOptions = [
			{ value: 'ETH', label: strings('app_settings.primary_currency_text_first'), key: 'Native' },
			{ value: 'Fiat', label: strings('app_settings.primary_currency_text_second'), key: 'Fiat' }
		];
	};

	render() {
		const { currentCurrency, primaryCurrency } = this.props;
		return (
			<ScrollView style={styles.wrapper}>
				<View style={styles.inner}>
					<View style={[styles.setting, styles.firstSetting]}>
						<Text style={styles.title}>{strings('app_settings.conversion_title')}</Text>
						<Text style={styles.desc}>{strings('app_settings.conversion_desc')}</Text>
						<View style={styles.picker}>
							<SelectComponent
								selectedValue={currentCurrency}
								onValueChange={this.selectCurrency}
								label={strings('app_settings.current_conversion')}
								options={infuraCurrencyOptions}
							/>
						</View>
					</View>
					<View style={styles.setting}>
						<Text style={styles.title}>{strings('app_settings.primary_currency_title')}</Text>
						<Text style={styles.desc}>{strings('app_settings.primary_currency_desc')}</Text>
						<View style={styles.simplePicker}>
							{this.primaryCurrencyOptions && (
								<PickComponent
									pick={this.selectPrimaryCurrency}
									textFirst={strings('app_settings.primary_currency_text_first')}
									valueFirst={'ETH'}
									textSecond={strings('app_settings.primary_currency_text_second')}
									valueSecond={'Fiat'}
									selectedValue={primaryCurrency}
								/>
							)}
						</View>
					</View>
					<View style={styles.setting}>
						<Text style={styles.title}>{strings('app_settings.current_language')}</Text>
						<Text style={styles.desc}>{strings('app_settings.language_desc')}</Text>
						<View style={styles.picker}>
							{this.languageOptions && (
								<SelectComponent
									selectedValue={this.state.currentLanguage}
									onValueChange={this.selectLanguage}
									label={strings('app_settings.current_language')}
									options={this.languageOptions}
								/>
							)}
						</View>
					</View>
					<View style={styles.setting}>
						<Text style={styles.title}>{strings('app_settings.search_engine')}</Text>
						<Text style={styles.desc}>{strings('app_settings.engine_desc')}</Text>
						<View style={styles.picker}>
							{this.searchEngineOptions && (
								<SelectComponent
									selectedValue={this.props.searchEngine}
									onValueChange={this.selectSearchEngine}
									label={strings('app_settings.search_engine')}
									options={this.searchEngineOptions}
								/>
							)}
						</View>
					</View>
				</View>
			</ScrollView>
		);
	}
}

const mapStateToProps = state => ({
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	searchEngine: state.settings.searchEngine,
	primaryCurrency: state.settings.primaryCurrency
});

const mapDispatchToProps = dispatch => ({
	setSearchEngine: searchEngine => dispatch(setSearchEngine(searchEngine)),
	setPrimaryCurrency: primaryCurrency => dispatch(setPrimaryCurrency(primaryCurrency))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Settings);
