/* eslint react/prop-types: 0 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Entypo from 'react-native-vector-icons/Entypo';

import CustomText from '../../../Base/Text';
// TODO: Convert into typescript and correctly type optionals
const Text = CustomText as any;

const styles = StyleSheet.create({
	chevron: {
		marginLeft: 10,
	},
});

interface Props {
	currency: string;
}

const CurrencyChevron = ({ currency, ...props }: Props) => (
	<View {...props}>
		<Text black>
			<Text black bold>
				{currency}
			</Text>
			{'  '}
			<Entypo name="chevron-down" size={16} style={styles.chevron} />
		</Text>
	</View>
);

export default CurrencyChevron;
