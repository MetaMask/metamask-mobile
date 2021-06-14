import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '../../Base/Text';

const styles = StyleSheet.create({
	root: {
		paddingHorizontal: 24
	}
});

const EditGasFee1559 = () => (
	<View style={styles.root}>
		<View>
			<Text>HEADER</Text>
		</View>
		<View>
			<Text>SELECTOR</Text>
		</View>
		<View>
			<Text>ADVANCED AND RANGE INPUTS</Text>
		</View>
		<View>
			<Text>SAVE BUTTON</Text>
		</View>
	</View>
);

export default EditGasFee1559;
