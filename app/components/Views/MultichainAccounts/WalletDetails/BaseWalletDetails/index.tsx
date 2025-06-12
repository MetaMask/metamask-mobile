import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderBase from '../../../../../component-library/components/HeaderBase';
import ButtonLink from '../../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { AccountDetailsIds } from '../../../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';
import { AccountWallet } from '../WalletDetails';
import { View } from 'react-native';

interface BaseWalletDetailsProps {
  wallet: AccountWallet;
  children?: React.ReactNode;
}

export const BaseWalletDetails = ({
  wallet,
  children,
}: BaseWalletDetailsProps) => {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBase
        style={styles.header}
        startAccessory={
          <ButtonLink
            testID={AccountDetailsIds.BACK_BUTTON}
            labelTextVariant={TextVariant.BodyMDMedium}
            label={<Icon name={IconName.ArrowLeft} size={IconSize.Md} />}
            onPress={() => navigation.goBack()}
          />
        }
      >
        {wallet.metadata.name}
      </HeaderBase>
      <View>{children}</View>
    </SafeAreaView>
  );
};
