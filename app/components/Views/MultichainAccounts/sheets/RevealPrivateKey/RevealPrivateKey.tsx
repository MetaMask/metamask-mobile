import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import { RevealPrivateCredential } from '../../../RevealPrivateCredential';
import { PRIVATE_KEY } from '../../../RevealPrivateCredential/RevealPrivateCredential';
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import styleSheet from './RevealPrivateKey.styles';
import { useStyles } from '../../../../hooks/useStyles';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../../../util/navigation';

type RevealPrivateKeyProp = StackScreenProps<
  RootParamList,
  'RevealPrivateCredential'
>;

export const RevealPrivateKey = ({ route }: RevealPrivateKeyProp) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
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
