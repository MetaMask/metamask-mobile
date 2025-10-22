import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { AccountWalletObject } from '@metamask/account-tree-controller';
import { Box } from '../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../UI/Box/box.types';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { AccountDetailsIds } from '../../../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from '../AccountGroupDetails.styles';
import TempTouchableOpacity from '../../../../../component-library/components-temp/TempTouchableOpacity';

export interface WalletProps {
  wallet: AccountWalletObject | null;
}

export const Wallet = ({ wallet }: WalletProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;
  const navigation = useNavigation();

  const handleWalletClick = useCallback(() => {
    navigation.navigate(Routes.MULTICHAIN_ACCOUNTS.WALLET_DETAILS, {
      walletId: wallet?.id,
    });
  }, [navigation, wallet?.id]);

  return (
    <TempTouchableOpacity
      style={styles.wallet}
      testID={AccountDetailsIds.WALLET_NAME_LINK}
      onPress={handleWalletClick}
      shouldEnableAndroidPressIn
    >
      <Text variant={TextVariant.BodyMDMedium}>
        {strings('multichain_accounts.account_details.wallet')}
      </Text>
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={8}
      >
        <Text style={styles.text} variant={TextVariant.BodyMDMedium}>
          {wallet?.metadata.name}
        </Text>
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={colors.text.alternative}
        />
      </Box>
    </TempTouchableOpacity>
  );
};
