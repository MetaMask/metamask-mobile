import React, { useCallback, useState } from 'react';
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
import Modal from 'react-native-modal';
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
import { useWalletInfo } from '../hooks/useWalletInfo';
import Routes from '../../../../../constants/navigation/Routes';
import WalletAddAccountActions from './components/WalletAddAccountActions';

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
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  const accountAvatarType = useSelector(
    (state: RootState) => state.settings.useBlockieIcon,
  )
    ? AvatarAccountType.Blockies
    : AvatarAccountType.JazzIcon;

  const { accounts, keyringId, srpIndex, isSRPBackedUp } =
    useWalletInfo(wallet);

  const { formattedWalletTotalBalance, multichainBalancesForAllAccounts } =
    useWalletBalances(accounts);

  const handleGoToAccountDetails = useCallback(
    (account: InternalAccount) => {
      navigation.navigate(Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_DETAILS, {
        account,
      });
    },
    [navigation],
  );

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

  const handleAddAccount = useCallback(() => {
    if (keyringId) {
      setShowAddAccountModal(true);
    }
  }, [keyringId]);

  const handleCloseAddAccountModal = useCallback(() => {
    setShowAddAccountModal(false);
  }, []);

  const renderAccountItem = (account: InternalAccount, index: number) => {
    const totalItemsCount = keyringId ? accounts.length + 1 : accounts.length; // Include add account item if keyringId exists
    const boxStyles: ViewStyle[] = [styles.accountBox];
    const balanceData = multichainBalancesForAllAccounts[account.id];
    const isAccountBalanceLoading =
      !balanceData || balanceData.isLoadingAccount;
    const accountBalance = balanceData?.displayBalance;

    if (totalItemsCount > 1) {
      if (index === 0) {
        boxStyles.push(styles.firstAccountBox);
      } else if (index === accounts.length - 1 && !keyringId) {
        // Only make this the last item if there's no add account button
        boxStyles.push(styles.lastAccountBox);
      } else {
        boxStyles.push(styles.middleAccountBox as ViewStyle);
      }
    }

    return (
      <TouchableOpacity
        key={account.id}
        testID={`${WalletDetailsIds.ACCOUNT_ITEM}_${account.id}`}
        onPress={() => handleGoToAccountDetails(account)}
      >
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
      </TouchableOpacity>
    );
  };

  const renderAddAccountItem = () => {
    const totalItemsCount = accounts.length + 1;
    const boxStyles: ViewStyle[] = [styles.accountBox];

    if (totalItemsCount > 1) {
      boxStyles.push(styles.lastAccountBox);
    }

    return (
      <TouchableOpacity
        key="add-account"
        testID={WalletDetailsIds.ADD_ACCOUNT_BUTTON}
        onPress={handleAddAccount}
      >
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
            <Icon
              name={IconName.Add}
              size={IconSize.Md}
              color={colors.primary.default}
            />
            <Text
              style={{ color: colors.primary.default }}
              variant={TextVariant.BodyMDMedium}
            >
              {strings('multichain_accounts.wallet_details.add_account')}
            </Text>
          </Box>
        </Box>
      </TouchableOpacity>
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
            style={styles.srpRevealSection}
          >
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              justifyContent={JustifyContent.spaceBetween}
              style={styles.srpRevealContent}
            >
              <Box
                flexDirection={FlexDirection.Row}
                alignItems={AlignItems.center}
                gap={8}
              >
                <Text variant={TextVariant.BodyMDMedium}>
                  {strings(
                    'multichain_accounts.wallet_details.reveal_recovery_phrase_with_index',
                    {
                      index: srpIndex,
                    },
                  )}
                </Text>
              </Box>
              <Box
                flexDirection={FlexDirection.Row}
                alignItems={AlignItems.center}
                gap={8}
              >
                {isSRPBackedUp === false ? (
                  <TouchableOpacity onPress={handleBackupPressed}>
                    <Text
                      variant={TextVariant.BodyMDMedium}
                      style={{ color: colors.error.default }}
                    >
                      {strings('multichain_accounts.wallet_details.back_up')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
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
          {accounts.map((account, index) => renderAccountItem(account, index))}
          {keyringId && renderAddAccountItem()}
        </View>

        {children}
      </View>

      {keyringId && (
        <Modal
          isVisible={showAddAccountModal}
          style={styles.modalStyle}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          onBackdropPress={handleCloseAddAccountModal}
          onBackButtonPress={handleCloseAddAccountModal}
          swipeDirection="down"
          onSwipeComplete={handleCloseAddAccountModal}
          backdropOpacity={0.5}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background.default },
            ]}
          >
            <WalletAddAccountActions
              keyringId={keyringId}
              onBack={handleCloseAddAccountModal}
            />
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};
