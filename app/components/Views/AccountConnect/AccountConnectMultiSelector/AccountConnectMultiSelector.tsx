// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { View, Platform } from 'react-native';

// External dependencies.
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../../locales/i18n';
import TagUrl from '../../../../component-library/components/Tags/TagUrl';
import Text from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import AccountSelectorList from '../../../UI/AccountSelectorList';
import USER_INTENT from '../../../../constants/permissions';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { ACCOUNT_APPROVAL_SELECT_ALL_BUTTON } from '../../../../../wdio/screen-objects/testIDs/Components/AccountApprovalModal.testIds';

// Internal dependencies.
import styleSheet from './AccountConnectMultiSelector.styles';
import {
  AccountConnectMultiSelectorProps,
  AccountConnectMultiSelectorScreens,
} from './AccountConnectMultiSelector.types';
import AddAccountActions from '../../AddAccountActions';
import { ACCOUNT_LIST_ADD_BUTTON_ID } from '../../../../../wdio/screen-objects/testIDs/Components/AccountListComponent.testIds';

const AccountConnectMultiSelector = ({
  accounts,
  ensByAccountAddress,
  selectedAddresses,
  onSelectAddress,
  isLoading,
  onUserAction,
  favicon,
  secureIcon,
  isAutoScrollEnabled = true,
  urlWithProtocol,
  onBack,
}: AccountConnectMultiSelectorProps) => {
  const { styles } = useStyles(styleSheet, {});
  const [screen, setScreen] = useState<AccountConnectMultiSelectorScreens>(
    AccountConnectMultiSelectorScreens.AccountMultiSelector,
  );

  const onSelectAccount = useCallback(
    (accAddress) => {
      const selectedAddressIndex = selectedAddresses.indexOf(accAddress);
      // Reconstruct selected addresses.
      const newAccountAddresses = accounts.reduce((acc, { address }) => {
        if (accAddress === address) {
          selectedAddressIndex === -1 && acc.push(address);
        } else if (selectedAddresses.includes(address)) {
          acc.push(address);
        }
        return acc;
      }, [] as string[]);
      onSelectAddress(newAccountAddresses);
    },
    [accounts, selectedAddresses, onSelectAddress],
  );

  const renderSelectAllButton = useCallback(
    () =>
      Boolean(accounts.length) && (
        <Button
          variant={ButtonVariants.Link}
          onPress={() => {
            if (isLoading) return;
            const allSelectedAccountAddresses = accounts.map(
              ({ address }) => address,
            );
            onSelectAddress(allSelectedAccountAddresses);
          }}
          style={{
            ...styles.selectAllButton,
            ...(isLoading && styles.disabled),
          }}
          label={strings('accounts.select_all')}
          {...generateTestId(Platform, ACCOUNT_APPROVAL_SELECT_ALL_BUTTON)}
        />
      ),
    [accounts, isLoading, onSelectAddress, styles],
  );

  const renderUnselectAllButton = useCallback(
    () =>
      Boolean(accounts.length) && (
        <Button
          variant={ButtonVariants.Link}
          onPress={() => {
            if (isLoading) return;
            onSelectAddress([]);
          }}
          style={{
            ...styles.selectAllButton,
            ...(isLoading && styles.disabled),
          }}
          label={strings('accounts.unselect_all')}
        />
      ),
    [accounts, isLoading, onSelectAddress, styles],
  );

  const renderCtaButtons = useCallback(() => {
    const isConnectDisabled = Boolean(!selectedAddresses.length) || isLoading;

    return (
      <View style={styles.ctaButtonsContainer}>
        <Button
          variant={ButtonVariants.Secondary}
          label={strings('accounts.cancel')}
          onPress={() => onUserAction(USER_INTENT.Cancel)}
          size={ButtonSize.Lg}
          style={styles.button}
        />
        <View style={styles.buttonSeparator} />
        <Button
          variant={ButtonVariants.Primary}
          label={strings('accounts.connect_with_count', {
            countLabel: selectedAddresses.length
              ? ` (${selectedAddresses.length})`
              : '',
          })}
          onPress={() => onUserAction(USER_INTENT.Confirm)}
          size={ButtonSize.Lg}
          style={{
            ...styles.button,
            ...(isConnectDisabled && styles.disabled),
          }}
          disabled={isConnectDisabled}
          {...generateTestId(Platform, 'multiconnect-connect-button')}
        />
      </View>
    );
  }, [isLoading, onUserAction, selectedAddresses, styles]);

  const areAllAccountsSelected = accounts
    .map(({ address }) => address)
    .every((address) => selectedAddresses.includes(address));

  const renderAccountConnectMultiSelector = useCallback(
    () => (
      <>
        <SheetHeader
          title={strings('accounts.connect_accounts_title')}
          onBack={onBack}
        />
        <View style={styles.body}>
          <TagUrl
            imageSource={favicon}
            label={urlWithProtocol}
            iconName={secureIcon}
          />
          <Text style={styles.description}>
            {strings('accounts.connect_description')}
          </Text>
          {areAllAccountsSelected
            ? renderUnselectAllButton()
            : renderSelectAllButton()}
        </View>
        <AccountSelectorList
          onSelectAccount={onSelectAccount}
          accounts={accounts}
          ensByAccountAddress={ensByAccountAddress}
          isLoading={isLoading}
          selectedAddresses={selectedAddresses}
          isMultiSelect
          isRemoveAccountEnabled
          isAutoScrollEnabled={isAutoScrollEnabled}
        />
        <View style={styles.addAccountButtonContainer}>
          <Button
            variant={ButtonVariants.Link}
            label={strings('account_actions.add_account_or_hardware_wallet')}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            onPress={() =>
              setScreen(AccountConnectMultiSelectorScreens.AddAccountActions)
            }
            {...generateTestId(Platform, ACCOUNT_LIST_ADD_BUTTON_ID)}
          />
        </View>
        <View style={styles.body}>{renderCtaButtons()}</View>
      </>
    ),
    [
      accounts,
      areAllAccountsSelected,
      ensByAccountAddress,
      favicon,
      isAutoScrollEnabled,
      isLoading,
      onSelectAccount,
      renderCtaButtons,
      renderSelectAllButton,
      renderUnselectAllButton,
      secureIcon,
      selectedAddresses,
      styles.addAccountButtonContainer,
      styles.body,
      styles.description,
      urlWithProtocol,
      onBack,
    ],
  );

  const renderAddAccountActions = useCallback(
    () => (
      <AddAccountActions
        onBack={() =>
          setScreen(AccountConnectMultiSelectorScreens.AccountMultiSelector)
        }
      />
    ),
    [],
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
