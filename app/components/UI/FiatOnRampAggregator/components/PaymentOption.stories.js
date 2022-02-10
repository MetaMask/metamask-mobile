/* eslint-disable react-native/no-color-literals */
import React from 'react';
import { SafeAreaView } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import PaymentOption from './PaymentOption';
import { text, boolean } from '@storybook/addon-knobs';
storiesOf('FiatOnRamp / PaymentOption', module)
	.addDecorator((getStory) => getStory())
	.add('Default', () => {
		const title = text('Title', 'Apple Pay');
		const time = text('Time', '5-10 mins');
		const cardImage = boolean('Card Images', true);
		const lowestLimit = boolean('lowestLimit', true);
		const paymentIcon = text('Payment Icon', 'apple');
		const idRequired = boolean('ID Required', false);

		return (
			<SafeAreaView>
				<PaymentOption
					title={title}
					time={time}
					cardImage={cardImage}
					lowestLimit={lowestLimit}
					paymentIcon={paymentIcon}
					idRequired={idRequired}
				></PaymentOption>
				<PaymentOption
					title="Debit or Credit"
					time="5-10mins"
					cardImage={true}
					lowestLimit={true}
					idRequired={true}
					paymentIcon="credit-card"
				></PaymentOption>
				<PaymentOption
					title="Bank Account"
					time="1-5 business days"
					idRequired={true}
					paymentIcon="bank"
				></PaymentOption>
			</SafeAreaView>
		);
	});
