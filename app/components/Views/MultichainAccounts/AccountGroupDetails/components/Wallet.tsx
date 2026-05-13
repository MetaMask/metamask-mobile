import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AccountWalletObject } from '@metamask/account-tree-controller';
import {
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Box } from '../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../UI/Box/box.types';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { AccountDetailsIds } from '../../AccountDetails.testIds';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from '../AccountGroupDetails.styles';

export interface WalletProps {
  wallet: AccountWalletObject | null;
}

export const Wallet = ({ wallet }: WalletProps) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();

  const handleWalletClick = useCallback(() => {
    navigation.navigate(Routes.MULTICHAIN_ACCOUNTS.WALLET_DETAILS, {
      walletId: wallet?.id,
    });
  }, [navigation, wallet?.id]);

  return (
    <TouchableOpacity
      style={styles.wallet}
      testID={AccountDetailsIds.WALLET_NAME_LINK}
      onPress={handleWalletClick}
    >
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {strings('multichain_accounts.account_details.wallet')}
      </Text>
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={8}
      >
        <Text
          style={styles.text}
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
        >
          {wallet?.metadata.name}
        </Text>
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
        />
      </Box>
    </TouchableOpacity>
  );
};
