// Third party dependencies.
import React, { Fragment, useCallback, useState } from 'react';
import { SafeAreaView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import AccountAction from '../AccountAction/AccountAction';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Logger from '../../../util/Logger';
import Engine from '../../../core/Engine';

// Internal dependencies
import { AddAccountActionsProps } from './AddAccountActions.types';
import { AddAccountBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AddAccountBottomSheet.selectors';
import Routes from '../../../constants/navigation/Routes';
import { useMetrics } from '../../../components/hooks/useMetrics';

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { CaipChainId } from '@metamask/utils';
import { KeyringClient } from '@metamask/keyring-snap-client';
import { BitcoinWalletSnapSender } from '../../../core/SnapKeyring/BitcoinWalletSnap';
import { SolanaWalletSnapSender } from '../../../core/SnapKeyring/SolanaWalletSnap';
import { MultichainNetworks } from '../../../core/Multichain/constants';
import { useSelector } from 'react-redux';
import {
  hasCreatedBtcMainnetAccount,
  hasCreatedBtcTestnetAccount,
} from '../../../selectors/accountsController';
import {
  selectIsBitcoinSupportEnabled,
  selectIsBitcoinTestnetSupportEnabled,
  selectIsSolanaSupportEnabled,
} from '../../../selectors/multichain';
///: END:ONLY_INCLUDE_IF

const AddAccountActions = ({ onBack }: AddAccountActionsProps) => {
  const { navigate } = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isLoading, setIsLoading] = useState(false);

  const openImportAccount = useCallback(() => {
    navigate('ImportPrivateKeyView');
    onBack();
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
      ).build(),
    );
  }, [navigate, onBack, trackEvent, createEventBuilder]);

  const openConnectHardwareWallet = useCallback(() => {
    navigate(Routes.HW.CONNECT);
    onBack();
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CONNECT_HARDWARE_WALLET).build(),
    );
  }, [onBack, navigate, trackEvent, createEventBuilder]);

  const createNewAccount = useCallback(async () => {
    const { KeyringController } = Engine.context;
    try {
      setIsLoading(true);

      const addedAccountAddress = await KeyringController.addNewAccount();
      Engine.setSelectedAddress(addedAccountAddress);
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.ACCOUNTS_ADDED_NEW_ACCOUNT,
        ).build(),
      );
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      Logger.error(e, 'error while trying to add a new account');
    } finally {
      onBack();

      setIsLoading(false);
    }
  }, [onBack, setIsLoading, trackEvent, createEventBuilder]);

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const isBitcoinSupportEnabled = useSelector(selectIsBitcoinSupportEnabled);

  const isBitcoinTestnetSupportEnabled = useSelector(
    selectIsBitcoinTestnetSupportEnabled,
  );

  const isSolanaSupportEnabled = useSelector(selectIsSolanaSupportEnabled);

  const isBtcMainnetAccountAlreadyCreated = useSelector(
    hasCreatedBtcMainnetAccount,
  );
  const isBtcTestnetAccountAlreadyCreated = useSelector(
    hasCreatedBtcTestnetAccount,
  );

  const createBitcoinAccount = async (scope: CaipChainId) => {
    try {
      setIsLoading(true);
      // Client to create the account using the Bitcoin Snap
      const client = new KeyringClient(new BitcoinWalletSnapSender());

      // This will trigger the Snap account creation flow (+ account renaming)
      await client.createAccount({
        scope,
      });
    } catch (error) {
      Logger.error(error as Error, 'Bitcoin account creation failed');
    } finally {
      onBack();
      setIsLoading(false);
    }
  };

  const createSolanaAccount = async (scope: CaipChainId) => {
    try {
      setIsLoading(true);
      // Client to create the account using the Solana Snap
      const client = new KeyringClient(new SolanaWalletSnapSender());

      // This will trigger the Snap account creation flow (+ account renaming)
      await client.createAccount({
        scope,
      });
    } catch (error) {
      Logger.error(error as Error, 'Solana account creation failed');
    } finally {
      onBack();
      setIsLoading(false);
    }
  };
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
            testID={AddAccountBottomSheetSelectorsIDs.NEW_ACCOUNT_BUTTON}
          />
          {
            ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
          }
          {isSolanaSupportEnabled && (
            <AccountAction
              actionTitle={strings('account_actions.add_solana_account')}
              iconName={IconName.Add}
              onPress={async () => {
                await createSolanaAccount(MultichainNetworks.SOLANA);
              }}
              disabled={isLoading}
              testID={
                AddAccountBottomSheetSelectorsIDs.ADD_SOLANA_ACCOUNT_BUTTON
              }
            />
          )}
          {isBitcoinSupportEnabled && (
            <AccountAction
              actionTitle={strings(
                'account_actions.add_bitcoin_account_mainnet',
              )}
              iconName={IconName.Add}
              onPress={async () => {
                await createBitcoinAccount(MultichainNetworks.BITCOIN);
              }}
              disabled={isLoading || isBtcMainnetAccountAlreadyCreated}
              testID={
                AddAccountBottomSheetSelectorsIDs.ADD_BITCOIN_ACCOUNT_BUTTON
              }
            />
          )}
          {isBitcoinTestnetSupportEnabled && (
            <AccountAction
              actionTitle={strings(
                'account_actions.add_bitcoin_account_testnet',
              )}
              iconName={IconName.Add}
              onPress={async () => {
                await createBitcoinAccount(MultichainNetworks.BITCOIN_TESTNET);
              }}
              disabled={isLoading || isBtcTestnetAccountAlreadyCreated}
              testID={
                AddAccountBottomSheetSelectorsIDs.ADD_BITCOIN_TESTNET_ACCOUNT_BUTTON
              }
            />
          )}
          {
            ///: END:ONLY_INCLUDE_IF
          }
          <AccountAction
            actionTitle={strings('account_actions.import_account')}
            iconName={IconName.Import}
            onPress={openImportAccount}
            disabled={isLoading}
            testID={AddAccountBottomSheetSelectorsIDs.IMPORT_ACCOUNT_BUTTON}
          />
          <AccountAction
            actionTitle={strings('account_actions.add_hardware_wallet')}
            iconName={IconName.Hardware}
            onPress={openConnectHardwareWallet}
            disabled={isLoading}
            testID={
              AddAccountBottomSheetSelectorsIDs.ADD_HARDWARE_WALLET_BUTTON
            }
          />
        </View>
      </Fragment>
    </SafeAreaView>
  );
};

export default AddAccountActions;
