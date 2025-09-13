import React from 'react';
import {
  createStackNavigator,
  StackNavigationOptions,
  StackScreenProps,
} from '@react-navigation/stack';
import { DepositSDKProvider } from '../sdk';
import Root from '../Views/Root';
import BuildQuote from '../Views/BuildQuote';
import EnterEmail from '../Views/EnterEmail';
import OtpCode from '../Views/OtpCode';
import VerifyIdentity from '../Views/VerifyIdentity';
import BasicInfo from '../Views/BasicInfo';
import EnterAddress from '../Views/EnterAddress';
import KycProcessing from '../Views/KycProcessing';
import OrderProcessing from '../Views/OrderProcessing';
import BankDetails from '../Views/BankDetails';
import AdditionalVerification from '../Views/AdditionalVerification';
import TokenSelectorModal from '../Views/Modals/TokenSelectorModal';
import RegionSelectorModal from '../Views/Modals/RegionSelectorModal';
import PaymentMethodSelectorModal from '../Views/Modals/PaymentMethodSelectorModal';
import UnsupportedRegionModal from '../Views/Modals/UnsupportedRegionModal';
import UnsupportedStateModal from '../Views/Modals/UnsupportedStateModal/UnsupportedStateModal';
import StateSelectorModal from '../Views/Modals/StateSelectorModal';
import WebviewModal, { KycWebviewModal } from '../Views/Modals/WebviewModal';
import IncompatibleAccountTokenModal from '../Views/Modals/IncompatibleAccountTokenModal';
import SsnInfoModal from '../Views/Modals/SsnInfoModal';
import ConfigurationModal from '../Views/Modals/ConfigurationModal';
import { RootParamList } from '../../../../../util/navigation/types';

const Stack = createStackNavigator<RootParamList>();

const getAnimationOptions = ({
  route,
}: StackScreenProps<
  RootParamList,
  | 'BuildQuote'
  | 'EnterEmail'
  | 'OtpCode'
  | 'VerifyIdentity'
  | 'BasicInfo'
  | 'EnterAddress'
  | 'KycProcessing'
  | 'OrderProcessing'
  | 'BankDetails'
  | 'AdditionalVerification'
>): StackNavigationOptions => ({
  animationEnabled: route.params?.animationEnabled !== false,
});

const MainRoutes = () => (
  <Stack.Navigator
    initialRouteName={'DepositRoot'}
    screenOptions={{ headerMode: 'screen' }}
  >
    <Stack.Screen
      name={'DepositRoot'}
      component={Root}
      options={{ animationEnabled: false }}
    />
    <Stack.Screen
      name={'BuildQuote'}
      component={BuildQuote}
      options={getAnimationOptions}
    />
    <Stack.Screen
      name={'EnterEmail'}
      component={EnterEmail}
      options={getAnimationOptions}
    />
    <Stack.Screen
      name={'OtpCode'}
      component={OtpCode}
      options={getAnimationOptions}
    />
    <Stack.Screen
      name={'VerifyIdentity'}
      component={VerifyIdentity}
      options={getAnimationOptions}
    />
    <Stack.Screen
      name={'BasicInfo'}
      component={BasicInfo}
      options={getAnimationOptions}
    />
    <Stack.Screen
      name={'EnterAddress'}
      component={EnterAddress}
      options={getAnimationOptions}
    />
    <Stack.Screen
      name={'KycProcessing'}
      component={KycProcessing}
      options={getAnimationOptions}
    />
    <Stack.Screen
      name={'OrderProcessing'}
      component={OrderProcessing}
      options={getAnimationOptions}
    />
    <Stack.Screen
      name={'BankDetails'}
      component={BankDetails}
      options={getAnimationOptions}
    />
    <Stack.Screen
      name={'AdditionalVerification'}
      component={AdditionalVerification}
      options={getAnimationOptions}
    />
  </Stack.Navigator>
);

const DepositModalsRoutes = () => (
  <Stack.Group screenOptions={{ presentation: 'transparentModal' }}>
    <Stack.Screen
      name={'DepositTokenSelectorModal'}
      component={TokenSelectorModal}
    />
    <Stack.Screen
      name={'DepositPaymentMethodSelectorModal'}
      component={PaymentMethodSelectorModal}
    />
    <Stack.Screen
      name={'DepositRegionSelectorModal'}
      component={RegionSelectorModal}
    />
    <Stack.Screen
      name={'DepositUnsupportedRegionModal'}
      component={UnsupportedRegionModal}
    />
    <Stack.Screen
      name={'DepositUnsupportedStateModal'}
      component={UnsupportedStateModal}
    />
    <Stack.Screen
      name={'DepositStateSelectorModal'}
      component={StateSelectorModal}
    />
    <Stack.Screen name={'DepositWebviewModal'} component={WebviewModal} />
    <Stack.Screen name={'DepositKycWebviewModal'} component={KycWebviewModal} />
    <Stack.Screen
      name={'IncompatibleAccountTokenModal'}
      component={IncompatibleAccountTokenModal}
    />
    <Stack.Screen name={'SsnInfoModal'} component={SsnInfoModal} />
    <Stack.Screen
      name={'DepositConfigurationModal'}
      component={ConfigurationModal}
    />
  </Stack.Group>
);

const DepositRoutes = () => (
  <DepositSDKProvider>
    <Stack.Navigator
      initialRouteName={'DepositRoot'}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name={'DepositRoot'} component={MainRoutes} />
      {DepositModalsRoutes()}
    </Stack.Navigator>
  </DepositSDKProvider>
);
export default DepositRoutes;
