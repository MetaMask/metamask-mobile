// Third party dependencies.
import React from 'react';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import SheetActions from '../../../component-library/components-temp/SheetActions';
import { strings } from '../../../../locales/i18n';

import Routes from '../../../constants/navigation/Routes';

const FirstDappConnect = () => {
  const navigation = useNavigation();

  const createNewAccount = () => {
    navigation.navigate(Routes.SHEET.DAPP_CONNECT.STACK, {
      screen: Routes.SHEET.DAPP_CONNECT.CONNECTED,
    });
  };

  return (
    <SheetActions
      actions={[
        {
          label: strings('accounts.create_new_account'),
          onPress: createNewAccount,
          isLoading: false,
        },
      ]}
    />
  );
};

export const SecondDappConnect = () => {
  const navigation = useNavigation();

  return (
    <SheetActions
      actions={[
        {
          label: 'Go back',
          onPress: () => navigation.goBack(),
          isLoading: false,
        },
        {
          label: 'Import Wallet',
          onPress: () => navigation.navigate('ImportPrivateKeyView'),
          disabled: false,
        },
        {
          label: 'Placeholder',
          onPress: () => null,
          disabled: false,
        },
      ]}
    />
  );
};

export default FirstDappConnect;
