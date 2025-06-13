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
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../UI/Box/box.types';
import { Box } from '../../../../UI/Box/Box';
import { strings } from '../../../../../../locales/i18n';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { AccountWallet } from '@metamask/account-tree-controller';
import Avatar, {
  AvatarAccountType,
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import { useWalletBalances } from '../hooks/useWalletBalances';
import { RootState } from '../../../../UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import { useSelector } from 'react-redux';
import AnimatedSpinner, { SpinnerSize } from '../../../../UI/AnimatedSpinner';
import { getInternalAccountsFromWallet } from '../utils/getInternalAccountsFromWallet';

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

  const accountAvatarType = useSelector(
    (state: RootState) => state.settings.useBlockieIcon,
  )
    ? AvatarAccountType.Blockies
    : AvatarAccountType.JazzIcon;

  const accounts = useMemo(
    () => getInternalAccountsFromWallet(wallet),
    [wallet],
  );

  const { formattedWalletTotalBalance, multichainBalancesForAllAccounts } =
    useWalletBalances(accounts);

  const handleEditWalletName = useCallback(() => {
    // TODO: Implement edit wallet name
  }, []);

  const renderAccountItem = (account: InternalAccount, index: number) => {
    const totalAccounts = accounts.length;
    const boxStyles: ViewStyle[] = [styles.accountBox];
    const balanceData = multichainBalancesForAllAccounts[account.id];
    const isAccountBalanceLoading =
      !balanceData || balanceData.isLoadingAccount;
    const accountBalance = balanceData?.displayBalance;

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
        justifyContent={JustifyContent.spaceBetween}
      >
        <Box
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
          <Text variant={TextVariant.BodyMDMedium}>
            {account.metadata.name}
          </Text>
        </Box>
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          gap={8}
        >
          {isAccountBalanceLoading ? (
            <AnimatedSpinner />
          ) : (
            <Text style={styles.text} variant={TextVariant.BodyMDMedium}>
              {accountBalance}
            </Text>
          )}
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Md}
            color={colors.text.alternative}
          />
        </Box>
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
            {formattedWalletTotalBalance === undefined ? (
              <AnimatedSpinner size={SpinnerSize.SM} />
            ) : (
              <Text style={styles.text} variant={TextVariant.BodyMDMedium}>
                {formattedWalletTotalBalance}
              </Text>
            )}
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
