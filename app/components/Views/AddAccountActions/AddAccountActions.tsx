// Third party dependencies.
import React, { Fragment, useCallback, useState } from 'react';
import { SafeAreaView, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import AccountAction from '../AccountAction/AccountAction';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Logger from '../../../util/Logger';

// Internal dependencies
import { AddAccountActionsProps } from './AddAccountActions.types';
import { AddAccountBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AddAccountBottomSheet.selectors';
import Routes from '../../../constants/navigation/Routes';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './AddAccountActions.styles';

import { addNewHdAccount } from '../../../actions/multiSrp';

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { CaipChainId } from '@metamask/utils';
import { KeyringClient } from '@metamask/keyring-snap-client';
import { BitcoinWalletSnapSender } from '../../../core/SnapKeyring/BitcoinWalletSnap';
import { SolanaWalletSnapSender } from '../../../core/SnapKeyring/SolanaWalletSnap';
import {
  selectHasCreatedBtcMainnetAccount,
  hasCreatedBtcTestnetAccount,
} from '../../../selectors/accountsController';
import {
  selectIsBitcoinSupportEnabled,
  selectIsBitcoinTestnetSupportEnabled,
  selectIsSolanaSupportEnabled,
} from '../../../selectors/multichain';
import { BtcScope, SolScope } from '@metamask/keyring-api';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

///: END:ONLY_INCLUDE_IF
import { selectHdKeyrings } from '../../../selectors/keyringController';

const AddAccountActions = ({
  onBack,
  onAddHdAccount,
}: AddAccountActionsProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { navigate } = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isLoading, setIsLoading] = useState(false);
  const hdKeyrings = useSelector(selectHdKeyrings);

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
  ///: BEGIN:ONLY_INCLUDE_IF(multi-srp)
  const openImportSrp = useCallback(() => {
    navigate(Routes.MULTI_SRP.IMPORT);
    onBack();
  }, [onBack, navigate]);
  ///: END:ONLY_INCLUDE_IF

  const createNewAccount = useCallback(async () => {
    const hasMultipleHdKeyrings = hdKeyrings.length > 1;

    if (hasMultipleHdKeyrings) {
      onAddHdAccount();
      return;
    }

    try {
      setIsLoading(true);

      await addNewHdAccount();

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
  }, [
    hdKeyrings.length,
    onAddHdAccount,
    trackEvent,
    createEventBuilder,
    onBack,
  ]);

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const isBitcoinSupportEnabled = useSelector(selectIsBitcoinSupportEnabled);

  const isBitcoinTestnetSupportEnabled = useSelector(
    selectIsBitcoinTestnetSupportEnabled,
  );

  const isSolanaSupportEnabled = useSelector(selectIsSolanaSupportEnabled);

  const isBtcMainnetAccountAlreadyCreated = useSelector(
    selectHasCreatedBtcMainnetAccount,
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
          <Text
            style={styles.subHeaders}
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
          >
            {strings('account_actions.create_an_account')}
          </Text>
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
                await createSolanaAccount(SolScope.Mainnet);
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
                await createBitcoinAccount(BtcScope.Mainnet);
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
                await createBitcoinAccount(BtcScope.Testnet);
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
          <Text
            style={styles.subHeaders}
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
          >
            {strings('account_actions.import_wallet_or_account')}
          </Text>
          {
            ///: BEGIN:ONLY_INCLUDE_IF(multi-srp)
            <AccountAction
              actionTitle={strings('account_actions.import_srp')}
              iconName={IconName.Wallet}
              onPress={openImportSrp}
              disabled={isLoading}
              testID={AddAccountBottomSheetSelectorsIDs.IMPORT_SRP_BUTTON}
            />
            ///: END:ONLY_INCLUDE_IF
          }
          <AccountAction
            actionTitle={strings('account_actions.import_account')}
            iconName={IconName.Key}
            onPress={openImportAccount}
            disabled={isLoading}
            testID={AddAccountBottomSheetSelectorsIDs.IMPORT_ACCOUNT_BUTTON}
          />
          <Text
            style={styles.subHeaders}
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
          >
            {strings('account_actions.connect_hardware_wallet')}
          </Text>
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
