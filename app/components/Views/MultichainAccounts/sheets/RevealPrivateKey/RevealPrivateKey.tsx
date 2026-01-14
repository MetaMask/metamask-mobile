import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import styleSheet from './RevealPrivateKey.styles';
import { useStyles } from '../../../../hooks/useStyles';

export const RevealPrivateKey = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const handleOnBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <SheetHeader
        onBack={handleOnBack}
        title={strings('multichain_accounts.reveal_private_key.title')}
      />
    </SafeAreaView>
  );
};
