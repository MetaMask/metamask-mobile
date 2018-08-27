import React, { Component } from 'react';
import { TextInput, View, StyleSheet, ScrollView } from 'react-native';
import PageFooter from '../PageFooter';
import { colors, fontStyles } from '../../styles/common';
import PropTypes from 'prop-types';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	scrollViewWrapper: {
		padding: 20
	},
	textInput: {
		borderWidth: 1,
		borderRadius: 4,
		borderColor: colors.borderColor,
		padding: 16
	}
});

/**
 * View that provides ability to add custom assets.
 */
export default class SearchAsset extends Component {
	state = { token: '' };

	static navigationOptions = {
		title: 'Custom Token',
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	};

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object
	};

	onTokenChange = token => {
		this.setState({ token });
	};

	cancelAddToken = () => {
		this.props.navigation.goBack();
	};

	render() {
		return (
			<View style={styles.wrapper} testID={'search-token-screen'}>
				<ScrollView contentContainerStyle={styles.scrollViewWrapper}>
					<TextInput
						style={styles.textInput}
						value={this.state.token}
						placeholder="Search Tokens"
						onChangeText={this.onTokenChange}
					/>
				</ScrollView>
				<PageFooter onCancel={this.cancelAddToken} cancelText={'CANCEL'} submitText={'NEXT'} />
			</View>
		);
	}
}
