import React from 'react';
import { SafeAreaView } from 'react-native';

import { storiesOf } from '@storybook/react-native';

import { action } from '@storybook/addon-actions';
import { text, boolean } from '@storybook/addon-knobs';

import AmountInput from './AmountInput';
import Text from '../../../Base/Text';

storiesOf('FiatOnRamp / AmountInput', module)
	.addDecorator((getStory) => getStory())
	.add('Default', () => {
		const highlighted = boolean('Highlighted', false);
		const label = text('Box label', 'Amount');
		const currencySymbol = text('Currency Symbol', '$');
		const currencyCode = text('Currency Code', 'USD');
		const amount = text('Amount', '123');
		const onAmountInputPress = action('AmountInput pressed');
		const onCurrencyPress = action('Currency pressed');

		return (
			<SafeAreaView>
				<Text big centered primary>
					{`<AmountInput>`} Component
				</Text>
				<Text primary>Example</Text>

				<AmountInput
					highlighted={highlighted}
					label={label}
					currencySymbol={currencySymbol}
					amount={amount}
					currencyCode={currencyCode}
					onPress={onAmountInputPress}
					onCurrencyPress={onCurrencyPress}
				/>
			</SafeAreaView>
		);
	});
