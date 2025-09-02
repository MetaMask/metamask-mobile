import React, { useCallback, useState, useMemo, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity, View, InteractionManager } from 'react-native';
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
import { WalletDetailsIds } from '../../../../../../e2e/selectors/MultichainAccounts/WalletDetails';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../UI/Box/box.types';
import { Box } from '../../../../UI/Box/Box';
import { strings } from '../../../../../../locales/i18n';
import {
  AccountWalletObject,
  AccountGroupObject,
} from '@metamask/account-tree-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { useWalletBalances } from '../hooks/useWalletBalances';
import { useSelector } from 'react-redux';
import AnimatedSpinner, { SpinnerSize } from '../../../../UI/AnimatedSpinner';
import { useWalletInfo } from '../hooks/useWalletInfo';
import Routes from '../../../../../constants/navigation/Routes';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import AccountCell from '../../../../../component-library/components-temp/MultichainAccounts/AccountCell/AccountCell';
import { selectAccountGroupsByWallet } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectMultichainAccountsState2Enabled } from '../../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import AccountItem from './components/AccountItem';
import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar';
import { RootState } from '../../../../../reducers';
import Logger from '../../../../../util/Logger';
import Engine from '../../../../../core/Engine';

interface BaseWalletDetailsProps {
  wallet: AccountWalletObject;
  children?: React.ReactNode;
}

export const BaseWalletDetails = ({
  wallet,
  children,
}: BaseWalletDetailsProps) => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;
  const [isLoading, setIsLoading] = useState(false);
  const accountGroupsFlashListRef =
    useRef<FlashListRef<AccountGroupObject> | null>(null);
  const accountsFlashListRef = useRef<FlashListRef<InternalAccount> | null>(
    null,
  );

  const { accounts, keyringId, isSRPBackedUp } = useWalletInfo(wallet);

  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  const accountGroupsByWallet = useSelector(selectAccountGroupsByWallet);
  const accountGroups = useMemo(
    () =>
      accountGroupsByWallet.find((section) => section.wallet.id === wallet.id)
        ?.data ?? [],
    [accountGroupsByWallet, wallet.id],
  );

  const { formattedWalletTotalBalance, multichainBalancesForAllAccounts } =
    useWalletBalances(wallet.id);

  const accountAvatarType = useSelector(
    (state: RootState) => state.settings.useBlockieIcon,
  )
    ? AvatarAccountType.Blockies
    : AvatarAccountType.JazzIcon;

  const handleRevealSRP = useCallback(() => {
    if (keyringId) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.SRP_REVEAL_QUIZ,
        keyringId,
      });
    }
  }, [navigation, keyringId]);

  const handleBackupPressed = useCallback(() => {
    navigation.navigate(Routes.SET_PASSWORD_FLOW.ROOT, {
      screen: Routes.SET_PASSWORD_FLOW.MANUAL_BACKUP_STEP_1,
      params: { backupFlow: true },
    });
  }, [navigation]);

  const handleGoToAccountDetails = useCallback(
    (account: InternalAccount) => {
      navigation.navigate(Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_DETAILS, {
        account,
      });
    },
    [navigation],
  );

  const handleCreateAccount = useCallback(async () => {
    if (!keyringId) {
      Logger.error(
        new Error('No keyring ID found for wallet'),
        'Cannot create account without keyring ID',
      );
      setIsLoading(false);
      return;
    }

    try {
      const { MultichainAccountService } = Engine.context;

      await MultichainAccountService.createNextMultichainAccountGroup({
        entropySource: keyringId,
      });

      // Scroll to the bottom to show the newly created account
      const currentRef = isMultichainAccountsState2Enabled
        ? accountGroupsFlashListRef.current
        : accountsFlashListRef.current;

      if (currentRef) {
        // Use a small delay to ensure the new account is rendered
        setTimeout(() => {
          currentRef?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (e: unknown) {
      Logger.error(
        e as Error,
        'error while trying to add a new multichain account',
      );
    } finally {
      setIsLoading(false);
    }
  }, [keyringId, isMultichainAccountsState2Enabled]);

  const handlePress = useCallback(() => {
    // Force immediate state update
    setIsLoading(true);

    // Use InteractionManager to ensure animations complete before heavy work
    InteractionManager.runAfterInteractions(() => {
      handleCreateAccount();
    });
  }, [handleCreateAccount]);

  // Render account group item for multichain accounts state 2
  const renderAccountGroupItem = ({
    item: accountGroup,
    index,
  }: {
    item: AccountGroupObject;
    index: number;
  }) => {
    const isFirst = index === 0;

    const accountBoxStyle = [
      styles.accountGroupBox,
      ...(isFirst ? [styles.firstAccountBox] : []),
    ];

    return (
      <View style={accountBoxStyle}>
        <AccountCell accountGroup={accountGroup} isSelected={false} hideMenu />
      </View>
    );
  };

  // Render individual account item for legacy view
  const renderAccountItem = ({
    item: account,
    index,
  }: {
    item: InternalAccount;
    index: number;
  }) => {
    const totalItemsCount = keyringId ? accounts.length + 1 : accounts.length; // Include add account item if keyringId exists
    const accountBalance = multichainBalancesForAllAccounts[account.id];
    const isAccountBalanceLoading = !accountBalance;

    return (
      <AccountItem
        account={account}
        index={index}
        totalItemsCount={totalItemsCount}
        accountBalance={accountBalance}
        isAccountBalanceLoading={isAccountBalanceLoading}
        accountAvatarType={accountAvatarType}
        onPress={handleGoToAccountDetails}
      />
    );
  };

  const renderAddAccountItem = () => (
    <TouchableOpacity
      testID={WalletDetailsIds.ADD_ACCOUNT_BUTTON}
      onPress={handlePress}
      disabled={isLoading || !keyringId}
      style={[
        styles.addAccountItem,
        (isLoading || !keyringId) && styles.addAccountItemDisabled,
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.addAccountIconContainer}>
        {isLoading ? (
          <AnimatedSpinner size={SpinnerSize.SM} />
        ) : (
          <Icon
            name={IconName.Add}
            size={IconSize.Md}
            color={colors.text.alternative}
          />
        )}
      </View>
      <Text variant={TextVariant.BodyMDMedium} style={styles.addAccountText}>
        {isLoading
          ? strings('multichain_accounts.wallet_details.creating_account')
          : strings('multichain_accounts.wallet_details.create_account')}
      </Text>
    </TouchableOpacity>
  );

  const renderAccountsList = () => {
    if (isMultichainAccountsState2Enabled) {
      return (
        <FlashList
          data={accountGroups}
          keyExtractor={(item) => item.id}
          renderItem={renderAccountGroupItem}
          ref={accountGroupsFlashListRef}
        />
      );
    }
    return (
      <FlashList
        data={accounts}
        keyExtractor={(item) => item.id}
        renderItem={renderAccountItem}
        ref={accountsFlashListRef}
      />
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
          <Box
            testID={WalletDetailsIds.WALLET_NAME}
            flexDirection={FlexDirection.Row}
            alignItems={AlignItems.center}
            gap={8}
          >
            <Text style={styles.text} variant={TextVariant.BodyMDMedium}>
              {wallet.metadata.name}
            </Text>
          </Box>
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
        {keyringId && (
          <TouchableOpacity
            testID={WalletDetailsIds.REVEAL_SRP_BUTTON}
            onPress={handleRevealSRP}
            style={styles.srpSection}
          >
            <Text variant={TextVariant.BodyMDMedium}>
              {strings('accounts.secret_recovery_phrase')}
            </Text>
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              justifyContent={JustifyContent.spaceBetween}
            >
              <Box
                flexDirection={FlexDirection.Row}
                alignItems={AlignItems.center}
                gap={8}
              >
                {isSRPBackedUp === false && (
                  <TouchableOpacity onPress={handleBackupPressed}>
                    <Text
                      variant={TextVariant.BodyMDMedium}
                      style={{ color: colors.error.default }}
                    >
                      {strings('multichain_accounts.wallet_details.back_up')}
                    </Text>
                  </TouchableOpacity>
                )}
                <Icon
                  name={IconName.ArrowRight}
                  size={IconSize.Md}
                  color={colors.text.alternative}
                />
              </Box>
            </Box>
          </TouchableOpacity>
        )}
        <View
          style={styles.accountsList}
          testID={WalletDetailsIds.ACCOUNTS_LIST}
        >
          <View style={styles.listContainer}>{renderAccountsList()}</View>
          {keyringId && renderAddAccountItem()}
        </View>

        {children}
      </View>
    </SafeAreaView>
  );
};
