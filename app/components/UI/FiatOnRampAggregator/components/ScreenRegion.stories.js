import React from 'react';
import { SafeAreaView } from 'react-native';

import { storiesOf } from '@storybook/react-native';

// import { action } from '@storybook/addon-actions';
import { boolean } from '@storybook/addon-knobs';

// import AmountInput from './AmountInput';
import Text from '../../../Base/Text';
import ScreenRegion from './ScreenRegion';

storiesOf('FiatOnRamp / ScreenRegion', module)
	.addDecorator((getStory) => getStory())
	.add('Default', () => {
		const scrollable = boolean('Scrollable', false);
		// const label = text('Box label', 'Amount');
		// const currencySymbol = text('Currency Symbol', '$');
		// const currencyCode = text('Currency Code', 'USD');
		// const amount = text('Amount', '123');
		// const onAmountInputPress = action('AmountInput pressed');
		// const onCurrencyPress = action('Currency pressed');

		return (
			<SafeAreaView scrollable={scrollable}>
				<ScreenRegion>
					<ScreenRegion.Header>
						<ScreenRegion.Content>
							<Text>Test Tesst Test</Text>
						</ScreenRegion.Content>
					</ScreenRegion.Header>
					<ScreenRegion.Body>
						<ScreenRegion.Content>
							<Text>Test Tesst Test</Text>
						</ScreenRegion.Content>
					</ScreenRegion.Body>
					<ScreenRegion.Footer>
						<ScreenRegion.Content>
							<Text>Test Tesst Test</Text>
						</ScreenRegion.Content>
					</ScreenRegion.Footer>
				</ScreenRegion>
			</SafeAreaView>
		);
	});
