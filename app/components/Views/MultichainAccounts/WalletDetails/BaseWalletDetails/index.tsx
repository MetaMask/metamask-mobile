import React, { useCallback, useMemo } from 'react';
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
import { TouchableOpacity, View, ViewStyle } from 'react-native';
import { WalletDetailsIds } from '../../../../../../e2e/selectors/MultichainAccounts/WalletDetails';
import { AlignItems, FlexDirection } from '../../../../UI/Box/box.types';
import { Box } from '../../../../UI/Box/Box';
import { strings } from '../../../../../../locales/i18n';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { AccountId } from '@metamask/accounts-controller';
import Engine from '../../../../../core/Engine';
import { AccountWallet } from '@metamask/account-tree-controller';
import Avatar, {
  AvatarAccountType,
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';

interface BaseWalletDetailsProps {
  wallet: AccountWallet;
  children?: React.ReactNode;
}

/**
 * Fetches internal accounts from the AccountsController based on the wallet's account IDs
 * @param wallet - The wallet containing account IDs to fetch
 * @returns Array of internal accounts
 */
const getInternalAccountsFromWallet = (
  wallet: AccountWallet,
): InternalAccount[] => {
  const { AccountsController } = Engine.context;
  const { accounts } = AccountsController.state.internalAccounts;

  // Extract all account IDs from the wallet's groups
  const accountIds: AccountId[] = [];
  Object.values(wallet.groups).forEach((group) => {
    accountIds.push(...group.accounts);
  });

  // Fetch internal accounts for each account ID
  const internalAccounts = accountIds
    .map((accountId) => accounts[accountId])
    .filter((account): account is InternalAccount => account !== undefined);

  return internalAccounts;
};

export const BaseWalletDetails = ({
  wallet,
  children,
}: BaseWalletDetailsProps) => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;

  const accountAvatarType = useSelector(
    (state: RootState) => state.settings.useBlockieIcon,
  )
    ? AvatarAccountType.Blockies
    : AvatarAccountType.JazzIcon;

  const handleEditWalletName = useCallback(() => {
    // TODO: Implement edit wallet name
  }, []);

  // Get internal accounts from the wallet
  const accounts = useMemo(
    () => getInternalAccountsFromWallet(wallet),
    [wallet],
  );

  const renderAccountItem = (account: InternalAccount, index: number) => {
    const totalAccounts = accounts.length;
    const boxStyles: ViewStyle[] = [styles.accountBox];

    if (totalAccounts > 1) {
      if (index === 0) {
        boxStyles.push(styles.firstAccountBox);
      } else if (index === totalAccounts - 1) {
        boxStyles.push(styles.lastAccountBox);
      } else {
        boxStyles.push(styles.middleAccountBox as ViewStyle);
      }
    }

    return (
      <Box
        style={boxStyles}
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={8}
      >
        <Avatar
          variant={AvatarVariant.Account}
          size={AvatarSize.Md}
          accountAddress={account.address}
          type={accountAvatarType}
        />
        <Text variant={TextVariant.BodyMDMedium}>{account.metadata.name}</Text>
      </Box>
    );
  };

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
        <View style={styles.walletName}>
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
        <View testID={WalletDetailsIds.WALLET_BALANCE} style={styles.balance}>
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('multichain_accounts.wallet_details.balance')}
          </Text>
          <Box
            flexDirection={FlexDirection.Row}
            alignItems={AlignItems.center}
            gap={8}
          >
            <Text style={styles.text} variant={TextVariant.BodyMDMedium}>
              $123.45
            </Text>
          </Box>
        </View>
        <View style={styles.accountsList}>
          {accounts.map((account, index) => renderAccountItem(account, index))}
        </View>
        {children}
      </View>
    </SafeAreaView>
  );
};
