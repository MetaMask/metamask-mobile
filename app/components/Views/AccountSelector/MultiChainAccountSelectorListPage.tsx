import React, { useCallback, useMemo, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import Engine from '../../../core/Engine';
import { selectSelectedAccountGroup } from '../../../selectors/multichainAccounts/accountTreeController';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import MultichainAccountSelectorList from '../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList';
import { ActivityIndicator, SafeAreaView } from 'react-native';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './MultiChainAccountSelectorListPage.styles';
import { TextVariant } from '../../../component-library/components/Texts/Text/Text.types';
import { useNavigation } from '@react-navigation/native';
import HeaderBase from '../../../component-library/components/HeaderBase';
import ButtonLink from '../../../component-library/components/Buttons/Button/variants/ButtonLink';
import Icon, {
  IconSize,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { useAccountsOperationsLoadingStates } from '../../../util/accounts/useAccountsOperationsLoadingStates';
import { Box } from '../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../UI/Box/box.types';
import Text from '../../../component-library/components/Texts/Text';
import { MultichainAddWalletActions } from '../../../component-library/components-temp/MultichainAccounts';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import { AccountListBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import BottomSheetFooter from '../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter';
import { SHEET_HEADER_BACK_BUTTON_ID } from '../../../component-library/components/Sheet/SheetHeader/SheetHeader.constants';

export const createMultichainAccountSelectorListPageNavigationDetails =
  createNavigationDetails(
    Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_SELECTOR_LIST_PAGE,
  );

const MultiChainAccountSelectorListPage = () => {
  // const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const { styles } = useStyles(styleSheet, {});
  const [showAddWalletActions, setShowAddWalletActions] = useState(false);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const {
    isAccountSyncingInProgress,
    loadingMessage: accountOperationLoadingMessage,
  } = useAccountsOperationsLoadingStates();

  const buttonLabel = useMemo(() => {
    if (isAccountSyncingInProgress) {
      return accountOperationLoadingMessage;
    }
    return strings('multichain_accounts.add_wallet');
  }, [isAccountSyncingInProgress, accountOperationLoadingMessage]);

  const handleAddAccount = useCallback(() => {
    setShowAddWalletActions(true);
  }, []);

  const addAccountButtonProps = useMemo(
    () => [
      {
        variant: ButtonVariants.Secondary,
        label: (
          <Box
            alignItems={AlignItems.center}
            justifyContent={JustifyContent.center}
            flexDirection={FlexDirection.Row}
            gap={8}
          >
            {isAccountSyncingInProgress && <ActivityIndicator size="small" />}
            <Text variant={TextVariant.BodyMDBold}>{buttonLabel}</Text>
          </Box>
        ),
        onPress: handleAddAccount,
        isDisabled: isAccountSyncingInProgress,
        testID: AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      },
    ],
    [buttonLabel, isAccountSyncingInProgress, handleAddAccount],
  );

  const handleCloseAddWalletActions = useCallback(() => {
    setShowAddWalletActions(false);
  }, []);

  const handleBackFromAddWalletActions = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const _onSelectMultichainAccount = useCallback(
    (accountGroup: AccountGroupObject) => {
      Engine.context.AccountTreeController.setSelectedAccountGroup(
        accountGroup.id,
      );
      // Navigate back to close the page after account selection
      navigation.goBack();
      // TODO: Add event tracking - should we still send number_of_accounts?
      // trackEvent(
      //   createEventBuilder(MetaMetricsEvents.SWITCHED_ACCOUNT)
      //     .addProperties({
      //       source: 'Wallet Tab',
      //       number_of_accounts: accounts?.length,
      //     })
      //     .build(),
      // );
    },
    [navigation],
  );
  return (
    <>
      <SafeAreaView style={styles.container}>
        <HeaderBase
          style={styles.header}
          startAccessory={
            <ButtonLink
              testID={SHEET_HEADER_BACK_BUTTON_ID} // TODO: Added now to minimize e2e test changes. Should be changed to something better reflecting what it is.
              labelTextVariant={TextVariant.BodyMDMedium}
              label={<Icon name={IconName.ArrowLeft} size={IconSize.Md} />}
              onPress={() => navigation.goBack()}
            />
          }
          startAccessoryWrapperProps={{
            style: styles.startAccessoryWrapper,
          }}
          endAccessoryWrapperProps={{
            style: styles.endAccessoryWrapper,
          }}
        >
          {strings('accounts.accounts_title')}
        </HeaderBase>
        {selectedAccountGroup && (
          <MultichainAccountSelectorList
            onSelectAccount={_onSelectMultichainAccount}
            selectedAccountGroups={[selectedAccountGroup]}
            testID={AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID}
          />
        )}
        <BottomSheetFooter
          buttonPropsArray={addAccountButtonProps}
          style={styles.footer}
        />
      </SafeAreaView>
      {showAddWalletActions ? (
        <BottomSheet
          ref={bottomSheetRef}
          onClose={handleCloseAddWalletActions}
          shouldNavigateBack={false}
        >
          <MultichainAddWalletActions onBack={handleBackFromAddWalletActions} />
        </BottomSheet>
      ) : null}
    </>
  );
};

export default MultiChainAccountSelectorListPage;
