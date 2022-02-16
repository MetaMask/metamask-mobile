import React from 'react';
import { SafeAreaView } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import PaymentOption, { Icon } from './PaymentOption';
import { text, boolean } from '@storybook/addon-knobs';

storiesOf('FiatOnRamp / PaymentOption', module)
	.addDecorator((getStory) => getStory())
	.add('Default', () => {
		const title = text('Title', 'Apple Pay');
		const time = text('Time', 'Instant');
		const cardImage = boolean('Card Images', true);
		const lowestLimit = boolean('lowestLimit', true);
		const idRequired = boolean('ID Required', false);
		return (
			<SafeAreaView>
				<PaymentOption
					title={title}
					time={time}
					cardImage={cardImage}
					lowestLimit={lowestLimit}
					paymentType={Icon.Apple}
					idRequired={idRequired}
				/>
				<PaymentOption
					title="Debit or Credit"
					time="5-10 mins"
					cardImage
					lowestLimit
					idRequired
					paymentType={Icon.Card}
				/>
				<PaymentOption title="Bank Account" time="1-5 business days" idRequired paymentType={Icon.Bank} />
			</SafeAreaView>
		);
	});
