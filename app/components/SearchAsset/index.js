import React, { Component } from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import Button from 'react-native-button';
import { colors, fontStyles } from '../../styles/common';
import PropTypes from 'prop-types';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		padding: 20
	},
	textInput: {
		borderWidth: 1,
		borderRadius: 4,
		borderColor: colors.borderColor,
		padding: 16
	},
	textAddToken: {
		color: colors.primary
	},
	textCancel: {
		color: colors.asphalt
	},
	button: {
		alignItems: 'center',
		padding: 16,
		borderWidth: 2,
		borderRadius: 4,
		width: '45%',
		marginTop: 10,
		marginBottom: 10
	},
	buttonCancel: {
		borderColor: colors.asphalt
	},
	buttonAddToken: {
		backgroundColor: colors.white,
		borderColor: colors.primary
	},
	footer: {
		flexDirection: 'row',
		justifyContent: 'space-evenly',
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		borderTopWidth: 1,
		borderColor: colors.borderColor
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
				<TextInput
					style={styles.textInput}
					value={this.state.token}
					placeholder="Search Tokens"
					onChangeText={this.onTokenChange}
				/>

				<View style={styles.footer}>
					<Button
						containerStyle={[styles.button, styles.buttonCancel]}
						style={[styles.textCancel, fontStyles.thin]}
						onPress={this.cancelAddToken}
					>
						CANCEL
					</Button>
					<Button
						containerStyle={[styles.button, styles.buttonAddToken]}
						style={[styles.textAddToken, fontStyles.thin]}
					>
						ADD TOKEN
					</Button>
				</View>
			</View>
		);
	}
}
