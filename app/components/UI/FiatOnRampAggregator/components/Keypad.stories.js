/* eslint-disable react-native/no-color-literals */
import React from 'react';
import { SafeAreaView } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';
import { action } from '@storybook/addon-actions';
import Text from '../../../Base/Text';

import Keypad from './Keypad';

storiesOf('FiatOnRamp / Keypad', module)
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
	});
