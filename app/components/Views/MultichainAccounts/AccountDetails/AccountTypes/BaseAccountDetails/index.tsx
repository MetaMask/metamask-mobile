import React, { useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { strings } from '../../../../../../../locales/i18n';
import styleSheet from './styles';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import ButtonLink from '../../../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import { formatAddress } from '../../../../../../util/address';
import Routes from '../../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';
import { Box } from '../../../../../UI/Box/Box';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import Avatar, {
  AvatarAccountType,
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import HeaderBase from '../../../../../../component-library/components/HeaderBase';
import { useStyles } from '../../../../../hooks/useStyles';
import { AccountDetailsIds } from '../../../../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import { selectWalletByAccount } from '../../../../../../selectors/multichainAccounts/accountTreeController';
import { selectGroupIdByAccountId } from '../../../../../../selectors/multichainAccounts/accountGroup';
import { selectMultichainAccountsState2Enabled } from '../../../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';

interface BaseAccountDetailsProps {
  account: InternalAccount;
  children?: React.ReactNode;
}

interface DetailRowProps {
  label: string;
  iconName: IconName;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPress: (...args: any[]) => void;
  testID: string;
  containerStyle: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
  iconColor: string;
  value?: React.ReactNode;
}

const DetailRow = ({
  label,
  value,
  iconName,
  onPress,
  testID,
  containerStyle,
  textStyle,
  iconColor,
}: DetailRowProps) => (
  <TouchableOpacity style={containerStyle} testID={testID} onPress={onPress}>
    <Text variant={TextVariant.BodyMDMedium}>{label}</Text>
    <Box
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      gap={8}
    >
      <Text style={textStyle} variant={TextVariant.BodyMDMedium}>
        {value}
      </Text>
      <Icon name={iconName} size={IconSize.Md} color={iconColor} />
    </Box>
  </TouchableOpacity>
);

export const BaseAccountDetails = ({
  account,
  children,
}: BaseAccountDetailsProps) => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;

  const accountAvatarType = useSelector(
    (state: RootState) => state.settings.useBlockieIcon,
  )
    ? AvatarAccountType.Blockies
    : AvatarAccountType.JazzIcon;

  const selectWallet = useSelector(selectWalletByAccount);
  const selectGroupId = useSelector(selectGroupIdByAccountId);
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const wallet = selectWallet?.(account.id);

  /**
   * Truncates the account/wallet name to a shorter version, keeping the first and last few characters.
   * @param name The full account name.
   * @param keepChars The number of characters to keep at the start and end of the name.
   * @returns The truncated name.
   */
  const truncateName = useCallback(
    (name: string, keepChars: number = 5): string => {
      const minLength = keepChars * 2 + 1;

      if (name.length <= minLength) {
        return name;
      }

      const start = name.slice(0, keepChars);
      const end = name.slice(-keepChars);

      return `${start}…${end}`;
    },
    [],
  );

  const handleEditAccountName = useCallback(() => {
    navigation.navigate(Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS, {
      screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.EDIT_ACCOUNT_NAME,
      params: { account },
    });
  }, [navigation, account]);

  const handleShareAddress = useCallback(() => {
    navigation.navigate(Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS, {
      screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS,
      params: {
        account,
      },
    });
  }, [navigation, account]);

  const onNavigateToShareAddressList = useCallback(() => {
    const groupId = selectGroupId(account.id);
    navigation.navigate(Routes.MULTICHAIN_ACCOUNTS.ADDRESS_LIST, {
      groupId,
      title: `${truncateName(account.metadata.name)} / ${strings(
        'multichain_accounts.address_list.addresses',
      )}`,
    });
  }, [
    account.id,
    account.metadata.name,
    navigation,
    selectGroupId,
    truncateName,
  ]);

  const handleWalletClick = useCallback(() => {
    if (!wallet) {
      return;
    }
    navigation.navigate(Routes.MULTICHAIN_ACCOUNTS.WALLET_DETAILS, {
      walletId: wallet.id,
    });
  }, [navigation, wallet]);

  const shareAddressRow = useCallback(
    () => (
      <DetailRow
        label={strings('multichain_accounts.account_details.account_address')}
        value={formatAddress(account.address, 'short')}
        iconName={IconName.ArrowRight}
        onPress={handleShareAddress}
        testID={AccountDetailsIds.ACCOUNT_ADDRESS_LINK}
        containerStyle={styles.accountAddress}
        textStyle={styles.text}
        iconColor={colors.text.alternative}
      />
    ),
    [
      account.address,
      colors.text.alternative,
      handleShareAddress,
      styles.accountAddress,
      styles.text,
    ],
  );

  const addressListRow = useCallback(
    () => (
      <DetailRow
        label={strings('multichain_accounts.account_details.networks')}
        iconName={IconName.ArrowRight}
        onPress={onNavigateToShareAddressList}
        testID={AccountDetailsIds.ACCOUNT_ADDRESS_LINK}
        containerStyle={styles.accountAddress}
        textStyle={styles.text}
        iconColor={colors.text.alternative}
      />
    ),
    [
      colors.text.alternative,
      onNavigateToShareAddressList,
      styles.accountAddress,
      styles.text,
    ],
  );

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
        {account.metadata.name}
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
            accountAddress={account.address}
            type={accountAvatarType}
          />
        </Box>

        <DetailRow
          label={strings('multichain_accounts.account_details.account_name')}
          value={truncateName(account.metadata.name)}
          iconName={IconName.Edit}
          onPress={handleEditAccountName}
          testID={AccountDetailsIds.ACCOUNT_NAME_LINK}
          containerStyle={styles.accountName}
          textStyle={styles.text}
          iconColor={colors.text.alternative}
        />

        {isMultichainAccountsState2Enabled
          ? addressListRow()
          : shareAddressRow()}

        <DetailRow
          label={strings('multichain_accounts.account_details.wallet')}
          value={wallet?.metadata.name}
          iconName={IconName.ArrowRight}
          onPress={handleWalletClick}
          testID={AccountDetailsIds.WALLET_NAME_LINK}
          containerStyle={styles.wallet}
          textStyle={styles.text}
          iconColor={colors.text.alternative}
        />

        {children}
      </ScrollView>
    </SafeAreaView>
  );
};
