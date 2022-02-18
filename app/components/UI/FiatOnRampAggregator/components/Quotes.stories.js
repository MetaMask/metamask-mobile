/* eslint-disable react-native/no-color-literals */
import Quotes from './Quotes';
import React from 'react';
import { SafeAreaView } from 'react-native';
import { storiesOf } from '@storybook/react-native';

storiesOf('FiatOnRamp / Quotes', module)
	.addDecorator((getStory) => getStory())
	.add('Default', () => (
		<SafeAreaView>
			<Quotes
				providerName="Transak"
				amountOut={0.06878071}
				crypto="ETH"
				fiat="USD"
				networkFee={9.28}
				processingFee={10.18}
				amountIn={300.0}
			/>

			<Quotes
				providerName="Wyre"
				amountOut={0.06878071}
				crypto="ETH"
				fiat="USD"
				networkFee={9.28}
				processingFee={10.18}
				amountIn={300.0}
				highlighted
			/>
		</SafeAreaView>
	));
