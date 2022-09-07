// Third party dependencies.
import React, { useRef } from 'react';
import {
  NavigationHelpersContext,
  StackRouter,
  useNavigationBuilder,
  createNavigatorFactory,
} from '@react-navigation/native';

// External dependencies.
import SheetBottom, {
  SheetBottomRef,
} from '../../../../component-library/components/Sheet/SheetBottom';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';

// Internal dependencies.
import Routes from '../../../../constants/navigation/Routes';

const ModalNavigator = ({ initialRouteName, children, screenOptions }: any) => {
  const { state, navigation, descriptors } = useNavigationBuilder(StackRouter, {
    children,
    screenOptions,
    initialRouteName,
  });

  const sheetRef = useRef<SheetBottomRef>(null);

  const createNewAccount = () => {
    navigation.navigate(Routes.SHEET.DAPP_CONNECT.STACK, {
      screen: Routes.SHEET.DAPP_CONNECT.CONNECTED,
    });
  }

  const modalIndex = state.index;

  const modalMeta = state.routes[modalIndex];

  const modalTitle = state.routeNames[modalIndex];

  console.log('state', state);
  console.log('navigation', navigation);
  console.log('descriptors', descriptors);

  return (
    <NavigationHelpersContext.Provider value={navigation}>
      <SheetBottom ref={sheetRef}>
        <SheetHeader title={modalTitle} />
        {descriptors[modalMeta.key].render()}
      </SheetBottom>
    </NavigationHelpersContext.Provider>
  );
};

export const createModalNavigator = createNavigatorFactory(ModalNavigator);

export default ModalNavigator;
