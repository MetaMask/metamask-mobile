import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { RevealPrivateCredential } from '../../../RevealPrivateCredential';
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import styleSheet from './RevealPrivateKey.styles';
import { useStyles } from '../../../../hooks/useStyles';

interface RootNavigationParamList extends ParamListBase {
  RevealPrivateKey: {
    account: InternalAccount;
  };
}

type RevealPrivateKeyProp = RouteProp<
  RootNavigationParamList,
  'RevealPrivateKey'
>;

export const RevealPrivateKey = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const route = useRoute<RevealPrivateKeyProp>();
  const { account } = route.params;
  const handleOnBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <SheetHeader
        onBack={handleOnBack}
        title={strings('multichain_accounts.reveal_private_key.title')}
      />
      <RevealPrivateCredential
        navigation={navigation}
        cancel={handleOnBack}
        route={{
          key: 'RevealPrivateCredential',
          name: 'RevealPrivateCredential',
          params: {
            shouldUpdateNav: false,
            selectedAccount: account,
          },
        }}
      />
    </SafeAreaView>
  );
};
