import React from 'react';
import {
  createStackNavigator,
  StackNavigationOptions,
} from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { DepositSDKProvider } from '../sdk';
import Root from '../Views/Root';
import Routes from '../../../../../constants/navigation/Routes';
import BuildQuote from '../Views/BuildQuote';
import EnterEmail from '../Views/EnterEmail';
import OtpCode from '../Views/OtpCode';
import VerifyIdentity from '../Views/VerifyIdentity';
import BasicInfo from '../Views/BasicInfo';
import EnterAddress from '../Views/EnterAddress';
import KycProcessing from '../Views/KycProcessing';
import ProviderWebview from '../Views/ProviderWebview';
import { BuyQuote } from '@consensys/native-ramps-sdk';

interface DepositParamList {
  [key: string]:
    | {
        animationEnabled?: boolean;
        quote?: BuyQuote;
      }
    | undefined;
}

const Stack = createStackNavigator<DepositParamList>();

const getAnimationOptions = ({
  route,
}: {
  route: RouteProp<DepositParamList, string>;
}): StackNavigationOptions => ({
  animationEnabled: route.params?.animationEnabled !== false,
});

const DepositRoutes = () => (
  <DepositSDKProvider>
    <Stack.Navigator initialRouteName={Routes.DEPOSIT.ROOT}>
      <Stack.Screen
        name={Routes.DEPOSIT.ROOT}
        component={Root}
        options={{ animationEnabled: false }}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.BUILD_QUOTE}
        component={BuildQuote}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.ENTER_EMAIL}
        component={EnterEmail}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.OTP_CODE}
        component={OtpCode}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.VERIFY_IDENTITY}
        component={VerifyIdentity}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.BASIC_INFO}
        component={BasicInfo}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.ENTER_ADDRESS}
        component={EnterAddress}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.KYC_PROCESSING}
        component={KycProcessing}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.PROVIDER_WEBVIEW}
        component={ProviderWebview}
        options={getAnimationOptions}
      />
    </Stack.Navigator>
  </DepositSDKProvider>
);

export default DepositRoutes;
