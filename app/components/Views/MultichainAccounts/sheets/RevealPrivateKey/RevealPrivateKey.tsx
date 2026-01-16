import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootParamList } from '../../../../../types/navigation';
import { RevealPrivateCredential } from '../../../RevealPrivateCredential';
import { PRIVATE_KEY } from '../../../RevealPrivateCredential/RevealPrivateCredential';
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import styleSheet from './RevealPrivateKey.styles';
import { useStyles } from '../../../../hooks/useStyles';

type RevealPrivateKeyProp = RouteProp<RootParamList, 'RevealPrivateKey'>;

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
        credentialName={PRIVATE_KEY}
        navigation={navigation}
        cancel={handleOnBack}
        route={{
          key: 'RevealPrivateCredential',
          name: 'RevealPrivateCredential',
          params: {
            credentialName: PRIVATE_KEY,
            shouldUpdateNav: false,
            selectedAccount: account,
          },
        }}
      />
    </SafeAreaView>
  );
};
