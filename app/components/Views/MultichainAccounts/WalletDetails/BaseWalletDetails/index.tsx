import React, { useCallback, useState, useMemo, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity, View } from 'react-native';
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

// Type for combined account data that includes the add account item
type AccountListItem = InternalAccount | { type: 'add-account' };
type AccountGroupListItem = AccountGroupObject | { type: 'add-account' };
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
import AddAccountItem from './components/AddAccountItem';
import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar';
import { RootState } from '../../../../../reducers';
import Logger from '../../../../../util/Logger';
import Engine from '../../../../../core/Engine';
import WalletAddAccountActions from './components/WalletAddAccountActions';

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
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const accountGroupsFlashListRef =
    useRef<FlashListRef<AccountGroupListItem> | null>(null);
  const accountsFlashListRef = useRef<FlashListRef<AccountListItem> | null>(
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

  // Combined data arrays that include the add account item as the last element
  const accountGroupsWithAddItem = useMemo(() => {
    const addAccountItem = { type: 'add-account' as const };
    return keyringId ? [...accountGroups, addAccountItem] : accountGroups;
  }, [accountGroups, keyringId]);

  const accountsWithAddItem = useMemo(() => {
    const addAccountItem = { type: 'add-account' as const };
    return keyringId ? [...accounts, addAccountItem] : accounts;
  }, [accounts, keyringId]);

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

      setIsLoading(false);

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
      setIsLoading(false);
    }
  }, [keyringId, isMultichainAccountsState2Enabled]);

  const handlePress = useCallback(() => {
    if (isMultichainAccountsState2Enabled) {
      // Force immediate state update
      setIsLoading(true);

      // Create account immediately without delay
      handleCreateAccount();
    } else {
      // Show the legacy add account modal for state 1
      setShowAddAccountModal(true);
    }
  }, [handleCreateAccount, isMultichainAccountsState2Enabled]);

  const handleCloseAddAccountModal = useCallback(() => {
    setShowAddAccountModal(false);
  }, []);

  // Render account group item for multichain accounts state 2
  const renderAccountGroupItem = ({
    item: accountGroup,
    index,
  }: {
    item: AccountGroupListItem;
    index: number;
  }) => {
    // Handle add account item
    if ('type' in accountGroup && accountGroup.type === 'add-account') {
      return (
        <AddAccountItem
          index={index}
          totalItemsCount={accountGroupsWithAddItem.length}
          isLoading={isLoading}
          onPress={handlePress}
        />
      );
    }

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
    item: AccountListItem;
    index: number;
  }) => {
    // Handle add account item
    if ('type' in account && account.type === 'add-account') {
      return (
        <AddAccountItem
          index={index}
          totalItemsCount={accountsWithAddItem.length}
          isLoading={isLoading}
          onPress={handlePress}
        />
      );
    }

    const accountBalance = multichainBalancesForAllAccounts[account.id];
    const isAccountBalanceLoading = !accountBalance;

    return (
      <AccountItem
        account={account}
        index={index}
        totalItemsCount={accountsWithAddItem.length}
        accountBalance={accountBalance}
        isAccountBalanceLoading={isAccountBalanceLoading}
        accountAvatarType={accountAvatarType}
        onPress={handleGoToAccountDetails}
      />
    );
  };

  const renderAccountsList = () => {
    if (isMultichainAccountsState2Enabled) {
      return (
        <FlashList
          data={accountGroupsWithAddItem}
          keyExtractor={(item, index) =>
            'type' in item && item.type === 'add-account'
              ? `add-account-${index}`
              : item.id
          }
          renderItem={renderAccountGroupItem}
          ref={accountGroupsFlashListRef}
        />
      );
    }
    return (
      <FlashList
        data={accountsWithAddItem}
        keyExtractor={(item, index) =>
          'type' in item && item.type === 'add-account'
            ? `add-account-${index}`
            : item.id
        }
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
        </View>

        {children}
      </View>
      {showAddAccountModal && keyringId && (
        <WalletAddAccountActions
          keyringId={keyringId}
          onBack={handleCloseAddAccountModal}
        />
      )}
    </SafeAreaView>
  );
};
