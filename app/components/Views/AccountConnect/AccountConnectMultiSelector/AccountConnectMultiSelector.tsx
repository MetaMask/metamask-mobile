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
import { ConnectAccountBottomSheetSelectorsIDs } from '../ConnectAccountBottomSheet.testIds';
import { AccountListBottomSheetSelectorsIDs } from '../../AccountSelector/AccountListBottomSheet.testIds';
import styleSheet from './AccountConnectMultiSelector.styles';
import {
  AccountConnectMultiSelectorProps,
  AccountConnectMultiSelectorScreens,
} from './AccountConnectMultiSelector.types';
import Checkbox from '../../../../component-library/components/Checkbox';
import { ConnectedAccountsSelectorsIDs } from '../ConnectedAccountModal.testIds';
import { isEqualCaseInsensitive } from '@metamask/controller-utils';
import { CaipAccountId } from '@metamask/utils';
import { Box } from '../../../UI/Box/Box';
import { FlexDirection, JustifyContent } from '../../../UI/Box/box.types';
import ButtonLink from '../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import AddAccountSelection from '../AddAccount/AddAccount';

const AccountConnectMultiSelector = ({
  accounts,
  ensByAccountAddress,
  defaultSelectedAddresses,
  onSubmit,
  onCreateAccount,
  isLoading,
  isAutoScrollEnabled = true,
  hostname,
  connection,
  onBack,
  screenTitle,
  isRenderedAsBottomSheet = true,
  showDisconnectAllButton = true,
}: AccountConnectMultiSelectorProps) => {
  const { styles } = useStyles(styleSheet, { isRenderedAsBottomSheet });
  const [screen, setScreen] = useState<AccountConnectMultiSelectorScreens>(
    AccountConnectMultiSelectorScreens.AccountMultiSelector,
  );

  const [selectedAddresses, setSelectedAddresses] = useState<CaipAccountId[]>(
    [],
  );

  useEffect(() => {
    setSelectedAddresses(defaultSelectedAddresses);
  }, [setSelectedAddresses, defaultSelectedAddresses]);

  const onSelectAccount = useCallback(
    (accAddress: CaipAccountId) => {
      const updatedSelectedAccountAddresses = selectedAddresses.filter(
        (selectedAccountId) =>
          !isEqualCaseInsensitive(selectedAccountId, accAddress),
      );

      if (updatedSelectedAccountAddresses.length === selectedAddresses.length) {
        setSelectedAddresses([...selectedAddresses, accAddress]);
      } else {
        setSelectedAddresses(updatedSelectedAccountAddresses);
      }
    },
    [selectedAddresses, setSelectedAddresses],
  );

  const handleSubmit = useCallback(() => {
    onSubmit(selectedAddresses);
  }, [onSubmit, selectedAddresses]);

  const handleDisconnect = useCallback(() => {
    onSubmit([]);
  }, [onSubmit]);

  const areAllAccountsSelected = accounts.every(({ caipAccountId }) =>
    selectedAddresses.includes(caipAccountId),
  );

  const areAnyAccountsSelected = selectedAddresses?.length !== 0;
  const areNoAccountsSelected = selectedAddresses?.length === 0;

  const renderSelectAllCheckbox = useCallback((): React.JSX.Element | null => {
    const areSomeSelectedButNotAll =
      areAnyAccountsSelected && !areAllAccountsSelected;

    const selectAll = () => {
      if (isLoading) return;
      const allSelectedAccountAddresses = accounts.map(
        ({ caipAccountId }) => caipAccountId,
      );
      setSelectedAddresses(allSelectedAccountAddresses);
    };

    const unselectAll = () => {
      if (isLoading) return;
      setSelectedAddresses([]);
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
    areAllAccountsSelected,
    areAnyAccountsSelected,
    accounts,
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
          <CaipAccountSelectorList
            onSelectAccount={onSelectAccount}
            accounts={accounts}
            ensByAccountAddress={ensByAccountAddress}
            isLoading={isLoading}
            selectedAddresses={selectedAddresses}
            isMultiSelect
            isRemoveAccountEnabled
            isAutoScrollEnabled={isAutoScrollEnabled}
            testID={AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID}
          />
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
      accounts,
      ensByAccountAddress,
      isAutoScrollEnabled,
      isLoading,
      onSelectAccount,
      renderCtaButtons,
      selectedAddresses,
      styles.body,
      styles.description,
      connection,
      styles.sdkInfoContainer,
      styles.container,
      styles.sdkInfoDivier,
      styles.newAccountButton,
      onBack,
      renderSelectAllCheckbox,
      screenTitle,
    ],
  );

  const renderAddAccountActions = useCallback(
    () => (
      <AddAccountSelection
        onBack={() => {
          setScreen(AccountConnectMultiSelectorScreens.AccountMultiSelector);
        }}
        onCreateAccount={(clientType, scope) => {
          onCreateAccount(clientType, scope);
        }}
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

export default AccountConnectMultiSelector;
