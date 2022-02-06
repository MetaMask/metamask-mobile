import React from 'react';
import { SafeAreaView, View } from 'react-native';

import { storiesOf } from '@storybook/react-native';

import { text } from '@storybook/addon-knobs';

import Box from './Box';
import Text from '../../../Base/Text';
import ListItem from '../../../Base/ListItem';
import CurrencyChevron from './CurrencyChevron';

storiesOf('FiatOnRamp / CurrencyChevron', module)
	.addDecorator((getStory) => getStory())
	.add('Default', () => {
		const currency = text('Currency', 'USD');

		return (
			<SafeAreaView>
				<Text big centered primary>
					{`<CurrencyChevron>`} Component
				</Text>
				<Text primary>Example</Text>

				<CurrencyChevron currency={currency} />

				<Text primary>Example with Box and ListItem</Text>

				<Box>
					<View>
						<ListItem.Content>
							<ListItem.Body>
								<Text big black>
									$1230
								</Text>
							</ListItem.Body>
							<ListItem.Body></ListItem.Body>
							<ListItem.Amounts>
								<CurrencyChevron currency={'CLP'} />
							</ListItem.Amounts>
						</ListItem.Content>
					</View>
				</Box>
			</SafeAreaView>
		);
	});
