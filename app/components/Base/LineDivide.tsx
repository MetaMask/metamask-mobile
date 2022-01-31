import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../styles/common';

const style = StyleSheet.create({
	divide: {
		borderBottomColor: colors.grey100,
		borderBottomWidth: StyleSheet.hairlineWidth,
		marginVertical: 5,
	},
});

function LineDivide(): JSX.Element {
	return <View style={style.divide} />;
}

export default LineDivide;
