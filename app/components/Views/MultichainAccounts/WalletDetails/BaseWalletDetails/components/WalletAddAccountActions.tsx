// Third party dependencies.
import React, { Fragment, useCallback, useState } from 'react';
import { SafeAreaView, View } from 'react-native';

// External dependencies.
import SheetHeader from '../../../../../../component-library/components/Sheet/SheetHeader';
import AccountAction from '../../../../AccountAction/AccountAction';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import Logger from '../../../../../../util/Logger';
import { useMetrics } from '../../../../../hooks/useMetrics';

import { addNewHdAccount } from '../../../../../../actions/multiSrp';
import { useAccountsWithNetworkActivitySync } from '../../../../../hooks/useAccountsWithNetworkActivitySync';
import { AddAccountBottomSheetSelectorsIDs } from '../../../../../../../e2e/selectors/wallet/AddAccountBottomSheet.selectors';

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { SolScope } from '@metamask/keyring-api';
import {
  MultichainWalletSnapFactory,
  WalletClientType,
} from '../../../../../../core/SnapKeyring/MultichainWalletSnapClient';
import { getMultichainAccountName } from '../../../../../../core/SnapKeyring/utils/getMultichainAccountName';
///: END:ONLY_INCLUDE_IF

interface WalletAddAccountActionsProps {
  onBack: () => void;
  keyringId: string;
}

const WalletAddAccountActions = ({
  onBack,
  keyringId,
}: WalletAddAccountActionsProps) => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isLoading, setIsLoading] = useState(false);

  const { fetchAccountsWithActivity } = useAccountsWithNetworkActivitySync({
    onFirstLoad: false,
    onTransactionComplete: false,
  });

  const createNewAccount = useCallback(async () => {
    try {
      setIsLoading(true);

      await addNewHdAccount(keyringId);
      fetchAccountsWithActivity();

      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.ACCOUNTS_ADDED_NEW_ACCOUNT,
        ).build(),
      );
    } catch (e: unknown) {
      Logger.error(e as Error, 'error while trying to add a new account');
    } finally {
      onBack();
      setIsLoading(false);
    }
  }, [
    keyringId,
    trackEvent,
    createEventBuilder,
    onBack,
    fetchAccountsWithActivity,
  ]);

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const createSolanaAccount = useCallback(async () => {
    try {
      setIsLoading(true);

      // Create Solana account directly without navigation
      const multichainWalletSnapClient =
        MultichainWalletSnapFactory.createClient(WalletClientType.Solana);
      const defaultAccountName = getMultichainAccountName(
        SolScope.Mainnet,
        WalletClientType.Solana,
      );

      await multichainWalletSnapClient.createAccount({
        scope: SolScope.Mainnet,
        accountNameSuggestion: defaultAccountName,
        entropySource: keyringId,
      });

      fetchAccountsWithActivity();

      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.ACCOUNTS_ADDED_NEW_ACCOUNT,
        ).build(),
      );
    } catch (e: unknown) {
      Logger.error(
        e as Error,
        'error while trying to add a new solana account',
      );
    } finally {
      onBack();
      setIsLoading(false);
    }
  }, [
    keyringId,
    trackEvent,
    createEventBuilder,
    onBack,
    fetchAccountsWithActivity,
  ]);
  ///: END:ONLY_INCLUDE_IF

  return (
    <SafeAreaView>
      <Fragment>
        <SheetHeader
          title={strings('account_actions.add_account')}
          onBack={onBack}
        />
        <View>
          <AccountAction
            actionTitle={strings('account_actions.add_new_account')}
            iconName={IconName.Add}
            onPress={createNewAccount}
            disabled={isLoading}
            testID={
              AddAccountBottomSheetSelectorsIDs.ADD_ETHEREUM_ACCOUNT_BUTTON
            }
          />
          {
            ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
          }
          <AccountAction
            actionTitle={strings('account_actions.add_solana_account')}
            iconName={IconName.Add}
            onPress={createSolanaAccount}
            disabled={isLoading}
            testID={AddAccountBottomSheetSelectorsIDs.ADD_SOLANA_ACCOUNT_BUTTON}
          />
          {
            ///: END:ONLY_INCLUDE_IF
          }
        </View>
      </Fragment>
    </SafeAreaView>
  );
};

export default WalletAddAccountActions;
