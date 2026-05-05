import React, { useCallback, useEffect, useMemo } from 'react';
import { BackHandler, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import styleSheet from './AccountGroupDetails.styles';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarAccountVariant,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
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
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount/AvatarAccount.types';
import { useStyles } from '../../../hooks/useStyles';
import { AccountDetailsIds } from '../AccountDetails.testIds';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import {
  selectWalletById,
  selectAccountGroupById,
} from '../../../../selectors/multichainAccounts/accountTreeController';
import {
  selectInternalAccountListSpreadByScopesByGroupId,
  getWalletIdFromAccountGroup,
  selectIconSeedAddressByAccountGroupId,
} from '../../../../selectors/multichainAccounts/accounts';
import { AccountGroupType } from '@metamask/account-api';
import {
  isHDOrFirstPartySnapAccount,
  isHardwareAccount,
} from '../../../../util/address';
import { selectInternalAccountsById } from '../../../../selectors/accountsController';
import { SecretRecoveryPhrase, Wallet, RemoveAccount } from './components';
import { createAddressListNavigationDetails } from '../AddressList';
import { createPrivateKeyListNavigationDetails } from '../PrivateKeyList/PrivateKeyList';
import { selectSeedlessOnboardingLoginFlow } from '../../../../selectors/seedlessOnboardingController';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import Routes from '../../../../constants/navigation/Routes';
import { selectAvatarAccountType } from '../../../../selectors/settings';

interface AccountGroupDetailsRouteParams {
  accountGroup: AccountGroupObject;
}

function mapAvatarAccountTypeToVariant(
  type: AvatarAccountType,
): AvatarAccountVariant {
  switch (type) {
    case AvatarAccountType.JazzIcon:
      return AvatarAccountVariant.Jazzicon;
    case AvatarAccountType.Blockies:
      return AvatarAccountVariant.Blockies;
    case AvatarAccountType.Maskicon:
    default:
      return AvatarAccountVariant.Maskicon;
  }
}

export const AccountGroupDetails = () => {
  const route =
    useRoute<RouteProp<{ params: AccountGroupDetailsRouteParams }, 'params'>>();
  const navigation = useNavigation();
  const { accountGroup: initialAccountGroup } = route.params;
  const { id } = initialAccountGroup;

  // Use selector to get current account group data from Redux store
  const accountGroup =
    useSelector((state: RootState) => selectAccountGroupById(state, id)) ||
    initialAccountGroup;

  const { metadata, type, accounts } = accountGroup;
  const groupName = useMemo(() => metadata.name, [metadata.name]);
  const walletId = useMemo(() => getWalletIdFromAccountGroup(id), [id]);
  const { styles } = useStyles(styleSheet, {});
  const accountAvatarType = useSelector(selectAvatarAccountType);
  const selectIconSeedAddress = React.useMemo(
    () => selectIconSeedAddressByAccountGroupId(id),
    [id],
  );
  const iconSeedAddress = useSelector(selectIconSeedAddress);

  const selectWallet = useSelector(selectWalletById);
  const wallet = selectWallet?.(walletId);
  const internalAccountsById = useSelector(selectInternalAccountsById);

  /**
   * Seedless onboarding flow does not support removing private key accounts
   */
  const isSeedlessOnboardingLoginFlow = useSelector(
    selectSeedlessOnboardingLoginFlow,
  );

  const selectInternalAccountsSpreadByScopes = useSelector(
    selectInternalAccountListSpreadByScopesByGroupId,
  );
  const internalAccountsSpreadByScopes =
    selectInternalAccountsSpreadByScopes(id);

  const account = useMemo(
    () => internalAccountsById[accounts[0]],
    [accounts, internalAccountsById],
  );

  const canExportMnemonic = useMemo(
    () => (account ? isHDOrFirstPartySnapAccount(account) : false),
    [account],
  );

  const isHardwareWallet = useMemo(
    () => (account ? isHardwareAccount(account.address) : false),
    [account],
  );

  const navigateToAddressList = useCallback(() => {
    // Start the trace before navigating to the address list to include the
    // navigation and render times in the trace.
    trace({
      name: TraceName.ShowAccountAddressList,
      op: TraceOperation.AccountUi,
      tags: {
        screen: 'account.details',
      },
    });

    navigation.navigate(
      ...createAddressListNavigationDetails({
        groupId: id,
        title: `${strings('multichain_accounts.address_list.addresses')} / ${
          metadata.name
        }`,
        onLoad: () => {
          endTrace({ name: TraceName.ShowAccountAddressList });
        },
      }),
    );
  }, [id, metadata.name, navigation]);

  const navigateToSmartAccount = useCallback(() => {
    navigation.navigate('SmartAccountDetails', { account });
  }, [navigation, account]);

  const handleEditAccountName = useCallback(() => {
    navigation.navigate(
      Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.EDIT_ACCOUNT_NAME,
      {
        accountGroup,
      },
    );
  }, [navigation, accountGroup]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        navigation.goBack();
        return true;
      },
    );

    return () => backHandler.remove();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBase
        style={styles.header}
        startButtonIconProps={{
          iconName: IconName.ArrowLeft,
          onPress: () => navigation.goBack(),
          testID: AccountDetailsIds.BACK_BUTTON,
          accessibilityLabel: strings('navigation.back'),
        }}
      >
        {groupName}
      </HeaderBase>
      <ScrollView
        style={styles.container}
        testID={AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Center}
          style={styles.avatar}
        >
          <AvatarAccount
            address={iconSeedAddress}
            variant={mapAvatarAccountTypeToVariant(accountAvatarType)}
            size={AvatarAccountSize.Xl}
            testID={AccountDetailsIds.ACCOUNT_GROUP_DETAILS_AVATAR}
          />
        </Box>
        <TouchableOpacity
          style={styles.accountName}
          testID={AccountDetailsIds.ACCOUNT_NAME_LINK}
          onPress={handleEditAccountName}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('multichain_accounts.account_details.account_name')}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={8}
          >
            <Text
              style={styles.groupNameText}
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {groupName}
            </Text>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Md}
              color={IconColor.IconAlternative}
            />
          </Box>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.networks}
          testID={AccountDetailsIds.NETWORKS_LINK}
          onPress={navigateToAddressList}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('multichain_accounts.account_details.networks')}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={8}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {`${internalAccountsSpreadByScopes.length} ${strings(
                'multichain_accounts.address_list.addresses',
              )}`}
            </Text>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Md}
              color={IconColor.IconAlternative}
            />
          </Box>
        </TouchableOpacity>
        {!isHardwareWallet && (
          <TouchableOpacity
            style={styles.privateKeys}
            testID={AccountDetailsIds.PRIVATE_KEYS_LINK}
            onPress={() => {
              navigation.navigate(
                ...createPrivateKeyListNavigationDetails({
                  groupId: id,
                  title: strings(
                    'multichain_accounts.account_details.private_keys',
                  ),
                }),
              );
            }}
          >
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('multichain_accounts.account_details.private_keys')}
            </Text>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={8}
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {strings(
                  'multichain_accounts.account_details.unlock_to_reveal',
                )}
              </Text>
              <Icon
                name={IconName.ArrowRight}
                size={IconSize.Md}
                color={IconColor.IconAlternative}
              />
            </Box>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.smartAccount}
          testID={AccountDetailsIds.SMART_ACCOUNT_LINK}
          onPress={navigateToSmartAccount}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('multichain_accounts.account_details.smart_account')}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={8}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {strings('multichain_accounts.account_details.set_up')}
            </Text>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Md}
              color={IconColor.IconAlternative}
            />
          </Box>
        </TouchableOpacity>
        <Wallet wallet={wallet} />
        {canExportMnemonic && <SecretRecoveryPhrase account={account} />}
        {type === AccountGroupType.SingleAccount &&
        !isSeedlessOnboardingLoginFlow ? (
          <RemoveAccount account={account} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};
