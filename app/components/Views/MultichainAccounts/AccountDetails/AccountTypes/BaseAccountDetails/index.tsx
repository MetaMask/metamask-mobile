import React, { useCallback } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarAccountVariant,
  FontWeight,
  HeaderBase,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import styleSheet from './styles';
import { formatAddress } from '../../../../../../util/address';
import Routes from '../../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';
import { Box } from '../../../../../UI/Box/Box';
import { useStyles } from '../../../../../hooks/useStyles';
import { AccountDetailsIds } from '../../../AccountDetails.testIds';
import { useSelector } from 'react-redux';
import {
  selectWalletByAccount,
  selectAccountToGroupMap,
} from '../../../../../../selectors/multichainAccounts/accountTreeController';
import { selectAvatarAccountType } from '../../../../../../selectors/settings';
import { AvatarAccountType } from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount/AvatarAccount.types';

/** Matches legacy {@link HEADERBASE_TITLE_TEST_ID} for stable E2E/unit queries. */
const HEADER_BASE_TITLE_TEST_ID = 'header-title';

const toAvatarAccountVariant = (
  type: AvatarAccountType,
): AvatarAccountVariant => {
  switch (type) {
    case AvatarAccountType.JazzIcon:
      return AvatarAccountVariant.Jazzicon;
    case AvatarAccountType.Blockies:
      return AvatarAccountVariant.Blockies;
    case AvatarAccountType.Maskicon:
    default:
      return AvatarAccountVariant.Maskicon;
  }
};

interface BaseAccountDetailsProps {
  account: InternalAccount;
  children?: React.ReactNode;
}

export const BaseAccountDetails = ({
  account,
  children,
}: BaseAccountDetailsProps) => {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const accountAvatarType = useSelector(selectAvatarAccountType);
  const selectWallet = useSelector(selectWalletByAccount);
  const wallet = selectWallet?.(account.id);
  const accountToGroupMap = useSelector(selectAccountToGroupMap);

  const handleEditAccountName = useCallback(() => {
    // Navigate to account group details with nested screen
    const accountGroup = accountToGroupMap[account.id];
    if (accountGroup) {
      navigation.navigate(Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_GROUP_DETAILS, {
        accountGroup,
        screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.EDIT_ACCOUNT_NAME,
        params: { accountGroup },
      });
    }
  }, [navigation, account.id, accountToGroupMap]);

  const handleShareAddress = useCallback(() => {
    navigation.navigate(Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS, {
      screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS,
      params: {
        account,
      },
    });
  }, [navigation, account]);

  const handleWalletClick = useCallback(() => {
    if (!wallet) {
      return;
    }

    navigation.navigate(Routes.MULTICHAIN_ACCOUNTS.WALLET_DETAILS, {
      walletId: wallet.id,
    });
  }, [navigation, wallet]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBase
        style={styles.header}
        titleTestID={HEADER_BASE_TITLE_TEST_ID}
        startButtonIconProps={{
          testID: AccountDetailsIds.BACK_BUTTON,
          iconName: IconName.ArrowLeft,
          onPress: () => navigation.goBack(),
        }}
      >
        {account.metadata.name}
      </HeaderBase>
      <ScrollView
        style={styles.container}
        testID={AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER}
      >
        <Box gap={24}>
          <Box
            flexDirection={FlexDirection.Row}
            justifyContent={JustifyContent.center}
          >
            <AvatarAccount
              address={account.address}
              size={AvatarAccountSize.Xl}
              variant={toAvatarAccountVariant(accountAvatarType)}
            />
          </Box>
          <Box style={styles.section}>
            <TouchableOpacity
              style={styles.baseRow}
              testID={AccountDetailsIds.ACCOUNT_NAME_LINK}
              onPress={handleEditAccountName}
            >
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings('multichain_accounts.account_details.account_name')}
              </Text>
              <Box
                flexDirection={FlexDirection.Row}
                alignItems={AlignItems.center}
                gap={8}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                >
                  {account.metadata.name}
                </Text>
                <Icon
                  name={IconName.Edit}
                  size={IconSize.Md}
                  color={IconColor.IconAlternative}
                />
              </Box>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.baseRow}
              testID={AccountDetailsIds.ACCOUNT_ADDRESS_LINK}
              onPress={handleShareAddress}
            >
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings('multichain_accounts.account_details.account_address')}
              </Text>
              <Box
                flexDirection={FlexDirection.Row}
                alignItems={AlignItems.center}
                gap={8}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                >
                  {formatAddress(account.address, 'short')}
                </Text>
                <Icon
                  name={IconName.ArrowRight}
                  size={IconSize.Md}
                  color={IconColor.IconAlternative}
                />
              </Box>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.baseRow}
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
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
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
          </Box>
          <Box style={styles.section}>{children}</Box>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
};
