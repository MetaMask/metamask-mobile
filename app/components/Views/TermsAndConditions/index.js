import React, { Component } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import { TouchableOpacity } from 'react-native-gesture-handler';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.transparent,
		flex: 1,
		width: '80%',
		alignSelf: 'center'
	},
	text: {
		...fontStyles.normal,
		color: colors.grey500,
		textAlign: 'center'
	},
	link: {
		textDecorationLine: 'underline'
	}
});

/**
 * View that is displayed in the flow to agree terms and conditions
 */
export default class TermsAndConditions extends Component {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object,
		/**
		 * Action string to be clicked to agree terms and conditions
		 */
		action: PropTypes.string
	};

	state = {
		renderWebview: false
	};

	press = () => {
		const { navigation } = this.props;
		navigation.push('Webview', {
			url: 'https://metamask.io/terms.html',
			title: 'Terms of Use'
		});
	};

	render() {
		const { action } = this.props;
		return (
			<View style={styles.mainWrapper}>
				<TouchableOpacity onPress={this.press}>
					<Text style={styles.text}>
						{`By clicking "${action}" you agree to these `}
						<Text style={styles.link}>{`Terms and Conditions`}</Text>.
					</Text>
				</TouchableOpacity>
			</View>
		);
	}
}
