import React, { PureComponent } from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';

const TERMS_AND_CONDITIONS = 'https://metamask.io/terms.html';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.transparent,
		alignSelf: 'center'
	},
	text: {
		...fontStyles.normal,
		color: colors.grey500,
		textAlign: 'center',
		fontSize: 10
	},
	link: {
		textDecorationLine: 'underline'
	}
});

/**
 * View that is displayed in the flow to agree terms and conditions
 */
export default class TermsAndConditions extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	press = () => {
		const { navigation } = this.props;
		navigation.navigate('Webview', {
			url: TERMS_AND_CONDITIONS,
			title: strings('terms_and_conditions.title')
		});
	};

	render() {
		return (
			<View style={styles.mainWrapper}>
				<TouchableOpacity onPress={this.press}>
					<Text style={styles.text}>
						{strings('terms_and_conditions.description')}
						<Text style={styles.link}>{strings('terms_and_conditions.terms')}</Text>.
					</Text>
				</TouchableOpacity>
			</View>
		);
	}
}
