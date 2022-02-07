/* eslint-disable react-native/no-color-literals */
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';
import { action } from '@storybook/addon-actions';

import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Text from '../Text';
import Keypad from '.';

const styles = StyleSheet.create({
	customKeypad: {
		backgroundColor: '#F8D5F9',
		paddingVertical: 15,
		width: 300,
	},
	customButtonStyle: {
		borderWidth: 2,
		paddingVertical: 2,
		margin: 5,
		borderRadius: 10,
		backgroundColor: '#FFBCFC',
		borderColor: '#F379F6',
	},

	customDigitTextStyle: {
		fontSize: 25,
		color: '#F124A3',
		fontFamily: 'Helvetica',
	},
});

storiesOf('Base / Keypad', module)
	.addDecorator((getStory) => getStory())
	.add('Default', () => {
		const currency = select('Currency', ['usd', 'eur', 'jpy', 'clp'], 'usd');
		const onKeypadChange = action('Keypad change');

		return (
			<SafeAreaView>
				<Text big centered primary>
					{`<Keypad>`} Component
				</Text>
				<Text primary>Example</Text>
				<Keypad value="123" onChange={onKeypadChange} currency={currency} />
			</SafeAreaView>
		);
	})
	.add('Customized', () => {
		const currency = select('Currency', ['usd', 'eur', 'jpy', 'clp'], 'usd');
		const onKeypadChange = action('Keypad change');

		return (
			<SafeAreaView>
				<Text big centered primary>
					Custom {`<Keypad>`} Component
				</Text>
				<Text primary>Example</Text>
				<Keypad
					value="123"
					onChange={onKeypadChange}
					currency={currency}
					style={styles.customKeypad}
					digitButtonStyle={styles.customButtonStyle}
					digitTextStyle={styles.customDigitTextStyle}
					periodButtonStyle={styles.customButtonStyle}
					periodTextStyle={styles.customDigitTextStyle}
					deleteButtonStyle={styles.customButtonStyle}
					deleteIcon={<FontAwesome name="cut" size={15} color="#F124A3" />}
				/>
			</SafeAreaView>
		);
	});
