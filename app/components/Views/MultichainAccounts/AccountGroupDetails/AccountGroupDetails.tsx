import React, { useCallback, useMemo } from 'react';
import { SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import styleSheet from './AccountGroupDetails.styles';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import ButtonLink from '../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import { useNavigation } from '@react-navigation/native';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../UI/Box/box.types';
import { Box } from '../../../UI/Box/Box';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Avatar, {
  AvatarAccountType,
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import HeaderBase from '../../../../component-library/components/HeaderBase';
import { useStyles } from '../../../hooks/useStyles';
import { AccountDetailsIds } from '../../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { selectWalletById } from '../../../../selectors/multichainAccounts/accountTreeController';
import {
  selectInternalAccountListSpreadByScopesByGroupId,
  getWalletIdFromAccountGroup,
} from '../../../../selectors/multichainAccounts/accounts';
import { AccountGroupType } from '@metamask/account-api';
import { isHDOrFirstPartySnapAccount } from '../../../../util/address';
import { selectInternalAccountsById } from '../../../../selectors/accountsController';
import { SecretRecoveryPhrase, Wallet, RemoveAccount } from './components';
import { StackScreenProps } from '@react-navigation/stack';
import { RootParamList } from '../../../../util/navigation';

type AccountGroupDetailsProps = StackScreenProps<
  RootParamList,
  'MultichainAccountGroupDetails'
>;

export const AccountGroupDetails = ({ route }: AccountGroupDetailsProps) => {
  const navigation = useNavigation();
  const {
    accountGroup: { id, metadata, type, accounts },
  } = route.params;
  const groupName = useMemo(() => metadata.name, [metadata.name]);
  const walletId = useMemo(() => getWalletIdFromAccountGroup(id), [id]);
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;
  const accountAvatarType = useSelector(
    (state: RootState) => state.settings.useBlockieIcon,
  )
    ? AvatarAccountType.Blockies
    : AvatarAccountType.JazzIcon;

  const selectWallet = useSelector(selectWalletById);
  const wallet = selectWallet?.(walletId);
  const internalAccountsById = useSelector(selectInternalAccountsById);

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

  const navigateToAddressList = useCallback(() => {
    navigation.navigate('MultichainAddressList', {
      groupId: id,
      title: `${strings('multichain_accounts.address_list.addresses')} / ${
        metadata.name
      }`,
    });
  }, [id, metadata.name, navigation]);

  const navigateToSmartAccount = useCallback(() => {
    navigation.navigate('SmartAccountDetails', { account });
  }, [navigation, account]);

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
        {groupName}
      </HeaderBase>
      <ScrollView
        style={styles.container}
        testID={AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER}
      >
        <Box
          flexDirection={FlexDirection.Row}
          justifyContent={JustifyContent.center}
          style={styles.avatar}
        >
          <Avatar
            variant={AvatarVariant.Account}
            size={AvatarSize.Xl}
            accountAddress={id}
            type={accountAvatarType}
          />
        </Box>
        <TouchableOpacity
          style={styles.accountName}
          testID={AccountDetailsIds.ACCOUNT_NAME_LINK}
        >
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('multichain_accounts.account_details.account_name')}
          </Text>
          <Box
            flexDirection={FlexDirection.Row}
            alignItems={AlignItems.center}
            gap={8}
          >
            <Text style={styles.text} variant={TextVariant.BodyMDMedium}>
              {groupName}
            </Text>
          </Box>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.networks}
          testID={AccountDetailsIds.NETWORKS_LINK}
          onPress={navigateToAddressList}
        >
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('multichain_accounts.account_details.networks')}
          </Text>
          <Box
            flexDirection={FlexDirection.Row}
            alignItems={AlignItems.center}
            gap={8}
          >
            <Text style={styles.text} variant={TextVariant.BodyMDMedium}>
              {`${internalAccountsSpreadByScopes.length} ${strings(
                'multichain_accounts.address_list.addresses',
              )}`}
            </Text>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Md}
              color={colors.text.alternative}
            />
          </Box>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.privateKeys}
          testID={AccountDetailsIds.PRIVATE_KEYS_LINK}
          onPress={() => {
            navigation.navigate('MultichainPrivateKeyList', {
              groupId: id,
              title: strings(
                'multichain_accounts.account_details.private_keys',
              ),
            });
          }}
        >
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('multichain_accounts.account_details.private_keys')}
          </Text>
          <Box
            flexDirection={FlexDirection.Row}
            alignItems={AlignItems.center}
            gap={8}
          >
            <Text style={styles.text} variant={TextVariant.BodyMDMedium}>
              {strings('multichain_accounts.account_details.unlock_to_reveal')}
            </Text>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Md}
              color={colors.text.alternative}
            />
          </Box>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.smartAccount}
          testID={AccountDetailsIds.SMART_ACCOUNT_LINK}
          onPress={navigateToSmartAccount}
        >
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('multichain_accounts.account_details.smart_account')}
          </Text>
          <Box
            flexDirection={FlexDirection.Row}
            alignItems={AlignItems.center}
            gap={8}
          >
            <Text style={styles.text} variant={TextVariant.BodyMDMedium}>
              {strings('multichain_accounts.account_details.set_up')}
            </Text>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Md}
              color={colors.text.alternative}
            />
          </Box>
        </TouchableOpacity>
        <Wallet wallet={wallet} />
        {canExportMnemonic && <SecretRecoveryPhrase account={account} />}
        {type === AccountGroupType.SingleAccount ? (
          <RemoveAccount account={account} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};
