import React from 'react';
import Text from '../../../Base/Text';
import ScreenView from '../../FiatOrders/components/ScreenView';
import { useFiatOnRampSDK } from '../SDK';

const GetStarted = () => {
	const SDK = useFiatOnRampSDK();

	return (
		<ScreenView>
			<Text>Get Started Screen</Text>
			<Text centered big black>
				Typeof SDK
			</Text>
			<Text>SDK: {typeof SDK}</Text>
			<Text>SDK.getCountries: {typeof SDK.getCountries}</Text>
		</ScreenView>
	);
};

export default GetStarted;
