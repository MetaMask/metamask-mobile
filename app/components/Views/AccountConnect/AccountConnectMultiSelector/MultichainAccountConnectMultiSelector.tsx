// Third party dependencies.
import React, { useCallback, useEffect, useState } from 'react';
import { View, SafeAreaView } from 'react-native';

// External dependencies.
import { strings } from '../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import Text, {
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import CaipAccountSelectorList from '../../../UI/CaipAccountSelectorList';
import HelpText, {
  HelpTextSeverity,
} from '../../../../component-library/components/Form/HelpText';

// Internal dependencies.
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectAccountBottomSheet.selectors';
import { AccountListBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import styleSheet from './AccountConnectMultiSelector.styles';
import {
  AccountConnectMultiSelectorProps,
  AccountConnectMultiSelectorScreens,
} from './AccountConnectMultiSelector.types';
import Checkbox from '../../../../component-library/components/Checkbox';
import { ConnectedAccountsSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';
import { isEqualCaseInsensitive } from '@metamask/controller-utils';
import { Box } from '../../../UI/Box/Box';
import { FlexDirection, JustifyContent } from '../../../UI/Box/box.types';
import ButtonLink from '../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import AddAccountSelection from '../AddAccount/AddAccount';
import { USER_INTENT } from '../../../../constants/permissions';
import { AccountGroupId } from '@metamask/account-api';
import { AccountGroupWithInternalAccounts } from '../../../../selectors/multichainAccounts/accounts';
import { AccountConnectScreens } from '../AccountConnect.types';
import accounts from '../../../../reducers/accounts';
import { ConnectionProps } from '../../../../core/SDKConnect/Connection';

interface MultichainAccountConnectMultiSelectorProps {
  accountGroups: AccountGroupWithInternalAccounts[];
  selectedAccountGroupIds: AccountGroupId[];
  isLoading: boolean;
  onSetScreen: (screen: AccountConnectScreens) => void;
  onSetSelectedAccountGroupIds: (accountGroupIds: AccountGroupId[]) => void;
  onCreateAccount: () => void;
  onUserAction: (intent: USER_INTENT) => void;
  onSubmit: (accountGroupIds: AccountGroupId[]) => void;
  isRenderedAsBottomSheet: boolean;
  showDisconnectAllButton: boolean;
  hostname: string;
  connection: ConnectionProps;
  screenTitle: string;
  onBack: () => void;
}

const MultichainAccountConnectMultiSelector = ({
  accountGroups: accountsGroups,
  isLoading,
  screenTitle,
  onBack,
  onSetScreen,
  onSetSelectedAccountGroupIds,
  onUserAction,
  onSubmit,
  onCreateAccount,
  isRenderedAsBottomSheet,
  showDisconnectAllButton,
  hostname,
  connection,
}: MultichainAccountConnectMultiSelectorProps) => {
  const { styles } = useStyles(styleSheet, { isRenderedAsBottomSheet });
  const [screen, setScreen] = useState<AccountConnectMultiSelectorScreens>(
    AccountConnectMultiSelectorScreens.AccountMultiSelector,
  );

  const [selectedAccountGroupIds, setSelectedAccountGroupIds] = useState<
    AccountGroupId[]
  >([]);

  useEffect(() => {
    setSelectedAccountGroupIds(selectedAccountGroupIds);
  }, [setSelectedAccountGroupIds, selectedAccountGroupIds]);

  const onSelectAccountGroupId = useCallback(
    (accountGroupId: AccountGroupId) => {
      const updatedSelectedAccountGroupIds = selectedAccountGroupIds.filter(
        (selectedAccountGroupId: AccountGroupId) =>
          !isEqualCaseInsensitive(selectedAccountGroupId, accountGroupId),
      );

      if (
        updatedSelectedAccountGroupIds.length === selectedAccountGroupIds.length
      ) {
        setSelectedAccountGroupIds([
          ...selectedAccountGroupIds,
          accountGroupId,
        ]);
      } else {
        setSelectedAccountGroupIds(updatedSelectedAccountGroupIds);
      }
    },
    [selectedAccountGroupIds, setSelectedAccountGroupIds],
  );

  const handleSubmit = useCallback(() => {
    onSubmit(selectedAccountGroupIds);
  }, [onSubmit, selectedAccountGroupIds]);

  const handleDisconnect = useCallback(() => {
    onSubmit([]);
  }, [onSubmit]);

  const areAllAccountsSelected = accountsGroups.every(
    (group: AccountGroupWithInternalAccounts) =>
      selectedAccountGroupIds.includes(group.id),
  );

  const areAnyAccountsSelected = selectedAccountGroupIds?.length !== 0;
  const areNoAccountsSelected = selectedAccountGroupIds?.length === 0;

  const renderSelectAllCheckbox = useCallback((): React.JSX.Element | null => {
    const areSomeSelectedButNotAll =
      areAnyAccountsSelected && !areAllAccountsSelected;

    const selectAll = () => {
      if (isLoading) return;
      setSelectedAccountGroupIds(
        accountsGroups.map(
          (group: AccountGroupWithInternalAccounts) => group.id,
        ),
      );
    };

    const unselectAll = () => {
      if (isLoading) return;
      setSelectedAccountGroupIds([]);
    };

    const onPress = () => {
      areAllAccountsSelected ? unselectAll() : selectAll();
    };

    return (
      <View>
        <Checkbox
          style={styles.selectAll}
          label={strings('accounts.select_all')}
          testID={ConnectAccountBottomSheetSelectorsIDs.SELECT_ALL_BUTTON}
          isIndeterminate={areSomeSelectedButNotAll}
          isChecked={areAllAccountsSelected}
          onPress={onPress}
        ></Checkbox>
      </View>
    );
  }, [
    accountsGroups,
    areAllAccountsSelected,
    areAnyAccountsSelected,
    isLoading,
    styles.selectAll,
  ]);

  const renderCtaButtons = useCallback(
    () => (
      <View style={styles.ctaButtonsContainer}>
        <View style={styles.connectOrUpdateButtonContainer}>
          {areAnyAccountsSelected && (
            <Button
              variant={ButtonVariants.Primary}
              label={strings('networks.update')}
              onPress={handleSubmit}
              size={ButtonSize.Lg}
              style={{
                ...styles.button,
                ...(isLoading && styles.disabled),
              }}
              disabled={isLoading}
              testID={ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON}
            />
          )}
        </View>
        {areNoAccountsSelected && showDisconnectAllButton && (
          <View style={styles.disconnectAllContainer}>
            <View style={styles.helpTextContainer}>
              <HelpText severity={HelpTextSeverity.Error}>
                {strings('common.disconnect_you_from', {
                  dappUrl: hostname,
                })}
              </HelpText>
            </View>
            <View style={styles.disconnectAllButtonContainer}>
              <Button
                variant={ButtonVariants.Primary}
                label={strings('accounts.disconnect')}
                testID={ConnectedAccountsSelectorsIDs.DISCONNECT}
                onPress={handleDisconnect}
                isDanger
                size={ButtonSize.Lg}
                style={{
                  ...styles.button,
                }}
              />
            </View>
          </View>
        )}
      </View>
    ),
    [
      areAnyAccountsSelected,
      isLoading,
      styles,
      areNoAccountsSelected,
      hostname,
      showDisconnectAllButton,
      handleDisconnect,
      handleSubmit,
    ],
  );

  const renderAccountConnectMultiSelector = useCallback(
    () => (
      <SafeAreaView>
        <View style={styles.container}>
          <SheetHeader
            title={screenTitle || strings('accounts.connect_accounts_title')}
            onBack={onBack}
          />
          <View style={styles.body}>
            <Text style={styles.description}>
              {accounts?.length > 0 &&
                strings('accounts.select_accounts_description')}
            </Text>
            <Box
              flexDirection={FlexDirection.Row}
              justifyContent={JustifyContent.spaceBetween}
            >
              {accounts?.length > 0 && renderSelectAllCheckbox()}
              <ButtonLink
                testID={
                  AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID
                }
                style={styles.newAccountButton}
                label={strings('accounts.new_account')}
                width={ButtonWidthTypes.Full}
                size={ButtonSize.Lg}
                onPress={() => {
                  setScreen(
                    AccountConnectMultiSelectorScreens.AddAccountActions,
                  );
                }}
              />
            </Box>
          </View>
          {/* <CaipAccountSelectorList
            onSelectAccount={onSelectAccount}
            accounts={accounts}
            ensByAccountAddress={ensByAccountAddress}
            isLoading={isLoading}
            selectedAddresses={selectedAddresses}
            isMultiSelect
            isRemoveAccountEnabled
            isAutoScrollEnabled={isAutoScrollEnabled}
            testID={AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID}
          /> */}
          {connection?.originatorInfo?.apiVersion && (
            <View style={styles.sdkInfoContainer}>
              <View style={styles.sdkInfoDivier} />
              <Text color={TextColor.Muted}>
                SDK {connection?.originatorInfo?.platform} v
                {connection?.originatorInfo?.apiVersion}
              </Text>
            </View>
          )}
          <View style={styles.body}>{renderCtaButtons()}</View>
        </View>
      </SafeAreaView>
    ),
    [
      styles.container,
      styles.body,
      styles.description,
      styles.newAccountButton,
      styles.sdkInfoContainer,
      styles.sdkInfoDivier,
      screenTitle,
      onBack,
      renderSelectAllCheckbox,
      connection?.originatorInfo?.apiVersion,
      connection?.originatorInfo?.platform,
      renderCtaButtons,
    ],
  );

  const renderAddAccountActions = useCallback(
    () => (
      <AddAccountSelection
        onBack={() => {
          setScreen(AccountConnectMultiSelectorScreens.AccountMultiSelector);
        }}
        onCreateAccount={onCreateAccount}
      />
    ),
    [onCreateAccount],
  );

  const renderAccountScreens = useCallback(() => {
    switch (screen) {
      case AccountConnectMultiSelectorScreens.AccountMultiSelector:
        return renderAccountConnectMultiSelector();
      case AccountConnectMultiSelectorScreens.AddAccountActions:
        return renderAddAccountActions();
      default:
        return renderAccountConnectMultiSelector();
    }
  }, [screen, renderAccountConnectMultiSelector, renderAddAccountActions]);

  return renderAccountScreens();
};

export default MultichainAccountConnectMultiSelector;
