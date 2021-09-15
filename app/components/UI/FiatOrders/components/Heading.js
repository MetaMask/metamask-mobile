import React from 'react';
import { View, StyleSheet } from 'react-native';
import Device from '../../../../util/device';

const style = StyleSheet.create({
	view: {
		margin: Device.isIphone5() ? 20 : 30,
	},
});

const Heading = ({ ...props }) => <View style={[style.view]} {...props} />;

export default Heading;
