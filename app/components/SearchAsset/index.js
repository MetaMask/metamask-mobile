import React, { Component } from 'react';
import { Text, TextInput, View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../styles/common';

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
	},
	textSearchToken: {
		color: colors.primary
	}
});

/**
 * View that provides ability to add custom assets.
 */
export default class SearchAsset extends Component {
	constructor(props) {
		super(props);
		this.state = {
			token: ''
		};
	}

	static navigationOptions = {
		title: 'Custom Token',
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	};

	render() {
		return (
			<View style={styles.wrapper} testID={'search-token-screen'}>
				<TextInput
					style={styles.textInput}
					value={this.state.token}
					placeholder="Search Tokens"
					onChangeText={token => this.setState({ token })}
				/>

				<View style={styles.footer}>
					<TouchableOpacity style={[styles.buttonCancel, styles.button]}>
						<Text>CANCEL</Text>
					</TouchableOpacity>
					<TouchableOpacity style={[styles.buttonAddToken, styles.button]}>
						<Text style={styles.textSearchToken}>NEXT</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}
}
