// Third party dependencies.
import React, { Fragment, useCallback, useState } from 'react';
import { SafeAreaView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import AccountAction from '../../../AccountAction/AccountAction';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Logger from '../../../../../util/Logger';
import Routes from '../../../../../constants/navigation/Routes';
import { useMetrics } from '../../../../../components/hooks/useMetrics';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from '../../../AddAccountActions/AddAccountActions.styles';
import { addNewHdAccount } from '../../../../../actions/multiSrp';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useAccountsWithNetworkActivitySync } from '../../../../hooks/useAccountsWithNetworkActivitySync';
import { AddAccountBottomSheetSelectorsIDs } from '../../../../../../e2e/selectors/wallet/AddAccountBottomSheet.selectors';

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { SolScope } from '@metamask/keyring-api';
import { WalletClientType } from '../../../../../core/SnapKeyring/MultichainWalletSnapClient';
///: END:ONLY_INCLUDE_IF

interface WalletAddAccountActionsProps {
  onBack: () => void;
  keyringId: string;
}

const WalletAddAccountActions = ({
  onBack,
  keyringId,
}: WalletAddAccountActionsProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { navigate } = useNavigation();
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
    navigate(Routes.SHEET.ADD_ACCOUNT, {
      scope: SolScope.Mainnet,
      clientType: WalletClientType.Solana,
    });
    onBack();
  }, [navigate, onBack]);
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
