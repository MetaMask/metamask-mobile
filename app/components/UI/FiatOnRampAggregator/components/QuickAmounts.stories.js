import React from 'react';
import { SafeAreaView } from 'react-native';

import { storiesOf } from '@storybook/react-native';

import { action } from '@storybook/addon-actions';

import QuickAmounts from './QuickAmounts';
import Text from '../../../Base/Text';
import Keypad from './Keypad';

const amounts = [
	{ value: 100, label: '$100' },
	{ value: 200, label: '$200' },
	{ value: 300, label: '$300' },
	{ value: 400, label: '$400' },
	{ value: 500, label: '$500' },
	{ value: 500, label: '$54000' },
	{ value: 600, label: '$600' },
	{ value: 700, label: '$700' },
];
storiesOf('FiatOnRamp / QuickAmounts', module)
	.addDecorator((getStory) => getStory())
	.add('Default', () => {
		const onPress = action('Amount pressed');
		const onKeypadChange = action('Keypad change');

		return (
			<SafeAreaView>
				<Text big centered primary>
					{`<QuickAmounts>`} Component
				</Text>
				<Text primary>Example</Text>
				<QuickAmounts onAmountPress={onPress} amounts={amounts} />
				<Text primary>With Keypad</Text>
				<QuickAmounts onAmountPress={onPress} amounts={amounts} />

				<Keypad value="123" onChange={onKeypadChange} currency={'usd'} />
			</SafeAreaView>
		);
	});
