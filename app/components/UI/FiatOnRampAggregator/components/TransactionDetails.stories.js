import React from 'react';
import { SafeAreaView } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import TransactionDetails, { TransactionStage } from './TransactionDetails';

storiesOf('FiatOnRamp / TransactionDetails', module)
	.addDecorator((getStory) => getStory())
	.add('Default', () => (
		<SafeAreaView>
			<TransactionDetails
				stage={TransactionStage.Processing}
				transactionID="QY34A1TAY3R"
				dateAndTime="FEB 2 2022, 5:05 PM UTC"
				paymentMethod="DEBIT CARD 2755"
				tokenAmount="0.06878071 ETH"
				fiatAmount="$280.54"
				exchangeRate="1 ETH @ $4,3427.86"
				totalFees="$19.46"
				providerName="MoonPay"
				purchaseAmountTotal="$300 USD"
				paymentType="bank"
			/>
		</SafeAreaView>
	));
