import React, { Component } from 'react';
import { Text, TextInput, View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		padding: 20
	},
	textTitle: {
		marginTop: 10,
		fontSize: 24,
		textAlign: 'left',
		fontWeight: '500'
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
 * View that provides ability to add assets.
 */
export default class AddAsset extends Component {
	constructor(props) {
		super(props);
		this.state = {
			address: '',
			symbol: '',
			decimals: ''
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
			<View style={styles.wrapper} testID={'add-custom-token-screen'}>
				<Text style={styles.textTitle}>Add Asset</Text>
				<Text>Custom Token</Text>
				<TextInput
					style={styles.textInput}
					value={this.state.address}
					onChangeText={address => this.setState({ address })}
				/>
				<Text>Token Symbol</Text>
				<TextInput
					style={styles.textInput}
					value={this.state.symbol}
					onChangeText={symbol => this.setState({ symbol })}
				/>
				<Text>Token of Precision</Text>
				<TextInput
					style={styles.textInput}
					value={this.state.decimals}
					keyboardType="numeric"
					maxLength={2}
					onChangeText={decimals => this.setState({ decimals })}
				/>
				<View style={styles.footer}>
					<TouchableOpacity style={[styles.buttonCancel, styles.button]}>
						<Text>CANCEL</Text>
					</TouchableOpacity>
					<TouchableOpacity style={[styles.buttonAddToken, styles.button]}>
						<Text style={styles.textAddToken}>ADD TOKEN</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}
}
