import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { RevealPrivateCredential } from '../../../RevealPrivateCredential';
import { PRIVATE_KEY } from '../../../RevealPrivateCredential/RevealPrivateCredential';

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
  const navigation = useNavigation();
  const route = useRoute<RevealPrivateKeyProp>();
  const { account } = route.params;
  const handleOnBack = () => {
    navigation.goBack();
  };

  return (
    <BottomSheet isFullscreen>
      <BottomSheetHeader onBack={handleOnBack}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('multichain_accounts.reveal_private_key.title')}
        </Text>
      </BottomSheetHeader>
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
    </BottomSheet>
  );
};
