import React, { memo, useCallback, useState, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, InteractionManager } from 'react-native';
import { useSelector } from 'react-redux';

import {
  Icon,
  IconName,
  IconSize,
  IconColor,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../hooks';
import AnimatedSpinner, {
  SpinnerSize,
} from '../../../../../components/UI/AnimatedSpinner';
import Logger from '../../../../../util/Logger';
import { strings } from '../../../../../../locales/i18n';
import { selectWalletsMap } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { useWalletInfo } from '../../../../../components/Views/MultichainAccounts/WalletDetails/hooks/useWalletInfo';
import { AccountWalletId, AccountWalletType } from '@metamask/account-api';
import { AccountListBottomSheetSelectorsIDs } from '../../../../../components/Views/AccountSelector/AccountListBottomSheet.testIds';
import createStyles from './AccountListFooter.styles';
import Engine from '../../../../../core/Engine';
import {
  TraceName,
  TraceOperation,
  endTrace,
  trace,
} from '../../../../../util/trace';
import { useAccountWalletOperationsLoadingStates } from '../../../../../util/accounts/useAccountWalletOperationsLoadingStates';

interface AccountListFooterProps {
  walletId: AccountWalletId;
  onAccountCreated: (newAccountId: string) => void;
}

const AccountListFooter = memo(
  ({ walletId, onAccountCreated }: AccountListFooterProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const { styles } = useStyles(createStyles, {});
    const {
      areAnyOperationsLoading,
      loadingMessage: accountOperationLoadingMessage,
    } = useAccountWalletOperationsLoadingStates(walletId);

    const isLoadingState = isLoading || areAnyOperationsLoading;

    const actionLabel = useMemo(() => {
      if (areAnyOperationsLoading) {
        return accountOperationLoadingMessage;
      }

      if (isLoadingState) {
        return strings('multichain_accounts.wallet_details.creating_account');
      }

      return strings('multichain_accounts.wallet_details.create_account');
    }, [
      isLoadingState,
      areAnyOperationsLoading,
      accountOperationLoadingMessage,
    ]);

    // Get wallet information to find the keyringId
    const walletsMap = useSelector(selectWalletsMap);
    const wallet = walletsMap?.[walletId];
    const walletInfo = useWalletInfo(wallet);

    // End trace when the loading finishes
    useEffect(() => {
      if (!isLoading) {
        endTrace({ name: TraceName.CreateMultichainAccount });
      }
    }, [isLoading]);

    const handleCreateAccount = useCallback(async () => {
      if (!walletInfo?.keyringId) {
        Logger.error(
          new Error('No keyring ID found for wallet'),
          'Cannot create account without keyring ID',
        );
        setIsLoading(false);
        return;
      }

      // Loading state is now set in handlePress before this function is called

      try {
        const { MultichainAccountService } = Engine.context;

        const newAccountGroup =
          await MultichainAccountService.createNextMultichainAccountGroup({
            entropySource: walletInfo.keyringId,
          });

        // Notify parent component about the newly created account
        if (newAccountGroup?.id) {
          onAccountCreated(newAccountGroup.id);
        }
      } catch (e: unknown) {
        Logger.error(
          e as Error,
          'error while trying to add a new multichain account',
        );
      } finally {
        setIsLoading(false);
      }
    }, [walletInfo?.keyringId, onAccountCreated]);

    const handlePress = useCallback(() => {
      // Start the trace before setting the loading state
      trace({
        name: TraceName.CreateMultichainAccount,
        op: TraceOperation.AccountCreate,
      });

      // Force immediate state update
      setIsLoading(true);

      // Use InteractionManager to ensure animations complete before heavy work
      InteractionManager.runAfterInteractions(() => {
        handleCreateAccount();
      });
    }, [handleCreateAccount]);

    if (!wallet || wallet.type !== AccountWalletType.Entropy) {
      return null;
    }

    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[
            styles.button,
            (isLoadingState || !walletInfo?.keyringId) && styles.buttonDisabled,
          ]}
          onPress={handlePress}
          disabled={isLoadingState || !walletInfo?.keyringId}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            {isLoadingState ? (
              <AnimatedSpinner size={SpinnerSize.SM} />
            ) : (
              <Icon
                name={IconName.Add}
                size={IconSize.Md}
                color={IconColor.PrimaryDefault}
              />
            )}
          </View>
          <Text
            variant={TextVariant.BodyMd}
            style={styles.buttonText}
            testID={AccountListBottomSheetSelectorsIDs.CREATE_ACCOUNT}
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      </View>
    );
  },
);

AccountListFooter.displayName = 'AccountListFooter';

export default AccountListFooter;
