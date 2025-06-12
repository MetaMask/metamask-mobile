import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderBase from '../../../../../component-library/components/HeaderBase';
import ButtonLink from '../../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { AccountWallet } from '../WalletDetails';
import { TouchableOpacity, View } from 'react-native';
import { WalletDetailsIds } from '../../../../../../e2e/selectors/MultichainAccounts/WalletDetails';
import { AlignItems, FlexDirection } from '../../../../UI/Box/box.types';
import { Box } from '../../../../UI/Box/Box';
import { strings } from '../../../../../../locales/i18n';

interface BaseWalletDetailsProps {
  wallet: AccountWallet;
  children?: React.ReactNode;
}

export const BaseWalletDetails = ({
  wallet,
  children,
}: BaseWalletDetailsProps) => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;

  const handleEditWalletName = useCallback(() => {
    // TODO: Implement edit wallet name
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBase
        style={styles.header}
        startAccessory={
          <ButtonLink
            testID={WalletDetailsIds.BACK_BUTTON}
            labelTextVariant={TextVariant.BodyMDMedium}
            label={<Icon name={IconName.ArrowLeft} size={IconSize.Md} />}
            onPress={() => navigation.goBack()}
          />
        }
      >
        {wallet.metadata.name}
      </HeaderBase>
      <View
        style={styles.container}
        testID={WalletDetailsIds.WALLET_DETAILS_CONTAINER}
      >
        <View style={styles.accountName}>
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('multichain_accounts.wallet_details.wallet_name')}
          </Text>
          <TouchableOpacity
            testID={WalletDetailsIds.WALLET_NAME}
            onPress={handleEditWalletName}
          >
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              gap={8}
            >
              <Text style={styles.text} variant={TextVariant.BodyMDMedium}>
                {wallet.metadata.name}
              </Text>
              <Icon
                name={IconName.Edit}
                size={IconSize.Md}
                color={colors.text.alternative}
              />
            </Box>
          </TouchableOpacity>
        </View>
        {children}
      </View>
    </SafeAreaView>
  );
};
