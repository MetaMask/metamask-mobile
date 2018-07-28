import React, { Component } from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors, fontStyles } from '../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center'
	},
	text: {
		fontSize: 20,
		color: colors.fontTertiary,
		...fontStyles.normal
	},
	add: {
		marginTop: 20,
		flexDirection: 'row'
	},
	addText: {
		fontSize: 15,
		color: colors.primary,
		...fontStyles.normal
	}
});

export default class Collectibles extends Component {
	render() {
		return (
			<View style={styles.wrapper}>
				<Text style={styles.text}>{`You don't have any collectible!`}</Text>
				<TouchableOpacity style={styles.add}>
					<Icon name="plus" size={16} color={colors.primary} />
					<Text style={styles.addText}>ADD COLLECTIBLES</Text>
				</TouchableOpacity>
			</View>
		);
	}
}
