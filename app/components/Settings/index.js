import React, { Component } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
		backgroundColor: colors.slate,
		flex: 1,
		justifyContent: 'center'
	}
});

export default class Settings extends Component {
	static navigationOptions = {
		title: 'Settings'
	};

	render() {
		return (
			<View style={styles.wrapper}>
				<Text>Coming soon...</Text>
			</View>
		);
	}
}
