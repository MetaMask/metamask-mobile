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
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { CaipChainId } from '@metamask/utils';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import { SolScope, BtcScope, TrxScope } from '@metamask/keyring-api';
///: END:ONLY_INCLUDE_IF
import { selectHDKeyrings } from '../../../selectors/keyringController';
import { useAccountsWithNetworkActivitySync } from '../../hooks/useAccountsWithNetworkActivitySync';

const AddAccountActions = ({ onBack }: AddAccountActionsProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { navigate } = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isLoading, setIsLoading] = useState(false);
  const hdKeyrings = useSelector(selectHDKeyrings);
  const hasMultipleSRPs = hdKeyrings.length > 1;

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
  const openImportSrp = useCallback(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.IMPORT_SECRET_RECOVERY_PHRASE_CLICKED,
      ).build(),
    );
    navigate(Routes.MULTI_SRP.IMPORT);
    onBack();
  }, [onBack, navigate, trackEvent, createEventBuilder]);

  const { fetchAccountsWithActivity } = useAccountsWithNetworkActivitySync({
    onFirstLoad: false,
    onTransactionComplete: false,
  });

  const createNewAccount = useCallback(async () => {
    if (hasMultipleSRPs) {
      navigate(Routes.SHEET.ADD_ACCOUNT, {});
      return;
    }

    try {
      setIsLoading(true);

      await addNewHdAccount();
      fetchAccountsWithActivity();

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
    hasMultipleSRPs,
    navigate,
    trackEvent,
    createEventBuilder,
    onBack,
    fetchAccountsWithActivity,
  ]);

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const createNonEvmAccount = async (scope: CaipChainId) => {
    const getClientType = (chainScope: CaipChainId): WalletClientType => {
      if (Object.values(BtcScope).includes(chainScope as BtcScope))
        return WalletClientType.Bitcoin;
      if (Object.values(SolScope).includes(chainScope as SolScope))
        return WalletClientType.Solana;
      if (Object.values(TrxScope).includes(chainScope as TrxScope))
        return WalletClientType.Tron;
      throw new Error(`Unsupported scope: ${chainScope}`);
    };

    const clientType = getClientType(scope);

    navigate(Routes.SHEET.ADD_ACCOUNT, {
      scope,
      clientType,
    });
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
            onPress={async () => {
              await createNonEvmAccount(SolScope.Mainnet);
            }}
            disabled={isLoading}
            testID={AddAccountBottomSheetSelectorsIDs.ADD_SOLANA_ACCOUNT_BUTTON}
          />
          {
            ///: END:ONLY_INCLUDE_IF
          }
          {
            ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
          }
          <AccountAction
            actionTitle={strings('account_actions.add_bitcoin_account')}
            iconName={IconName.Add}
            onPress={async () => {
              await createNonEvmAccount(BtcScope.Mainnet);
            }}
            disabled={isLoading}
            testID={
              AddAccountBottomSheetSelectorsIDs.ADD_BITCOIN_ACCOUNT_BUTTON
            }
          />
          {
            ///: END:ONLY_INCLUDE_IF
          }
          {
            ///: BEGIN:ONLY_INCLUDE_IF(tron)
          }
          <AccountAction
            actionTitle={strings('account_actions.add_tron_account')}
            iconName={IconName.Add}
            onPress={async () => {
              await createNonEvmAccount(TrxScope.Mainnet);
            }}
            disabled={isLoading}
            testID={AddAccountBottomSheetSelectorsIDs.ADD_TRON_ACCOUNT_BUTTON}
          />
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
            <AccountAction
              actionTitle={strings('account_actions.import_srp')}
              iconName={IconName.Wallet}
              onPress={openImportSrp}
              disabled={isLoading}
              testID={AddAccountBottomSheetSelectorsIDs.IMPORT_SRP_BUTTON}
            />
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
