import React, { useCallback } from 'react';
import { SafeAreaView, TouchableOpacity, View } from 'react-native';
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

interface BaseAccountDetailsProps {
  account: InternalAccount;
  children?: React.ReactNode;
}

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
  const walletName = 'Wallet 1'; //TODO: replace with useSelector(selectWalletName);

  const handleEditAccountName = useCallback(() => {
    navigation.navigate(
      Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.EDIT_ACCOUNT_NAME,
      {
        account,
      },
    );
  }, [navigation, account]);

  const handleShareAddress = useCallback(() => {
    navigation.navigate(Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS, {
      account,
    });
  }, [navigation, account]);

  const handleEditWalletName = useCallback(() => {
    // TODO: implement when the account group
  }, []);

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
      <View
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
        <TouchableOpacity
          style={styles.accountName}
          testID={AccountDetailsIds.ACCOUNT_NAME_LINK}
          onPress={handleEditAccountName}
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
              {account.metadata.name}
            </Text>
            <Icon
              name={IconName.Edit}
              size={IconSize.Md}
              color={colors.text.alternative}
            />
          </Box>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.accountAddress}
          testID={AccountDetailsIds.ACCOUNT_ADDRESS_LINK}
          onPress={handleShareAddress}
        >
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('multichain_accounts.account_details.account_address')}
          </Text>
          <Box
            flexDirection={FlexDirection.Row}
            alignItems={AlignItems.center}
            gap={8}
          >
            <Text style={styles.text} variant={TextVariant.BodyMDMedium}>
              {formatAddress(account.address, 'short')}
            </Text>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Md}
              color={colors.text.alternative}
            />
          </Box>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.wallet}
          testID={AccountDetailsIds.WALLET_NAME_LINK}
          onPress={handleEditWalletName}
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
              {walletName}
            </Text>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Md}
              color={colors.text.alternative}
            />
          </Box>
        </TouchableOpacity>
        {children}
      </View>
    </SafeAreaView>
  );
};
