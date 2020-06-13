import React from 'react';
import { View, StyleSheet } from 'react-native';

const style = StyleSheet.create({
	view: {
		margin: 30
	}
});

const Heading = ({ ...props }) => <View style={[style.view]} {...props} />;

export default Heading;
