import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer, useNavigationState } from '@react-navigation/native';
import { findRouteNameFromNavigatorState } from '../../../util/general';
import { Text } from 'react-native';

const Stack = createStackNavigator();

const TestScreen = () => {
	const routes = useNavigationState(state => state.routes);

	const name = findRouteNameFromNavigatorState(routes);

	if (name !== 'TestScreen')
		throw new Error(
			'Error, react navigation api changed: https://reactnavigation.org/docs/navigation-prop/#dangerouslygetstate'
		);

	return <Text>{name} THIS SHOULD NOT HAVE CHANGED, take a deeper look</Text>;
};

const TestSubStack = () => (
	<Stack.Navigator initialRouteName="TestScreen">
		<Stack.Screen name="TestScreen" component={TestScreen} />
	</Stack.Navigator>
);

const TestStack = () => (
	<Stack.Navigator initialRouteName="TestSubStack">
		<Stack.Screen name="TestSubStack" component={TestSubStack} />
	</Stack.Navigator>
);

const NavigationUnitTest = () => (
	<NavigationContainer>
		<Stack.Navigator initialRouteName="TestStack">
			<Stack.Screen name="TestStack" component={TestStack} />
		</Stack.Navigator>
	</NavigationContainer>
);
export default NavigationUnitTest;
