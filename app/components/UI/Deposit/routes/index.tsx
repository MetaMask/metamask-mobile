import React from 'react';
import {
  createStackNavigator,
  StackNavigationOptions,
} from '@react-navigation/stack';
import { DepositSDKProvider } from '../sdk';
import Root from '../Views/Root';
import Routes from '../../../../constants/navigation/Routes';
import BuildQuote from '../Views/BuildQuote';
import EnterEmail from '../Views/EnterEmail';
import { View } from 'react-native';
import Text from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from '../Views/EnterEmail/EnterEmail.styles';
import OtpCode from '../Views/OtpCode';

const Stack = createStackNavigator();

// TODO: Implement VerifyIdentity component
const VerifyIdentity = () => (
  <View>
    {/* eslint-disable-next-line react-native/no-inline-styles */}
    <Text style={{ textAlign: 'center', marginTop: 40 }}>
      Verify your identity placeholder
    </Text>
  </View>
);

const DepositRoutes = () => {
  const { theme } = useStyles(styleSheet, {});

  const headerStyles: StackNavigationOptions = {
    headerStyle: {
      backgroundColor: theme.colors.background.default,
      elevation: 0,
      shadowOpacity: 0,
    },
    headerTitleStyle: {
      fontWeight: '600',
      fontSize: 18,
      color: theme.colors.text.default,
    },
    headerBackTitleVisible: false,
  };

  return (
    <DepositSDKProvider>
      <Stack.Navigator
        initialRouteName={Routes.DEPOSIT.ROOT}
        screenOptions={headerStyles}
      >
        <Stack.Screen name={Routes.DEPOSIT.ROOT} component={Root} />
        <Stack.Screen
          name={Routes.DEPOSIT.BUILD_QUOTE}
          component={BuildQuote}
        />
        <Stack.Screen
          name={Routes.DEPOSIT.ENTER_EMAIL}
          component={EnterEmail}
        />
        <Stack.Screen name={Routes.DEPOSIT.OTP_CODE} component={OtpCode} />
        <Stack.Screen
          name={Routes.DEPOSIT.ID_VERIFY}
          component={VerifyIdentity}
        />
      </Stack.Navigator>
    </DepositSDKProvider>
  );
};

export default DepositRoutes;
