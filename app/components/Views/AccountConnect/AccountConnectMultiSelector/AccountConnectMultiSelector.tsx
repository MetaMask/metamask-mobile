// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';

// External dependencies.
import { strings } from '../../../../../locales/i18n';
import { ACCOUNT_APPROVAL_SELECT_ALL_BUTTON } from '../../../../../wdio/screen-objects/testIDs/Components/AccountApprovalModal.testIds';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import TagUrl from '../../../../component-library/components/Tags/TagUrl';
import Text, {
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { USER_INTENT } from '../../../../constants/permissions';
import AccountSelectorList from '../../../UI/AccountSelectorList';

// Internal dependencies.
import { ConnectAccountModalSelectorsIDs } from '../../../../../e2e/selectors/Modals/ConnectAccountModal.selectors';
import { ACCOUNT_LIST_ADD_BUTTON_ID } from '../../../../../wdio/screen-objects/testIDs/Components/AccountListComponent.testIds';
import AddAccountActions from '../../AddAccountActions';
import styleSheet from './AccountConnectMultiSelector.styles';
import {
  AccountConnectMultiSelectorProps,
  AccountConnectMultiSelectorScreens,
} from './AccountConnectMultiSelector.types';
import { isMutichainVersion1Enabled } from '../../../../util/networks';
import Checkbox from '../../../../component-library/components/Checkbox';

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
  connection,
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
      Boolean(accounts.length) &&
      !isMutichainVersion1Enabled && (
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
      Boolean(accounts.length) &&
      !isMutichainVersion1Enabled && (
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

  const areAllAccountsSelected = accounts
    .map(({ address }) => address)
    .every((address) => selectedAddresses.includes(address));

  const renderSelectAllCheckbox = useCallback((): React.JSX.Element | null => {
    const areAnyAccountsSelected = selectedAddresses?.length !== 0;
    const areSomeSelectedButNotAll =
      areAnyAccountsSelected && !areAllAccountsSelected;

    const selectAll = () => {
      if (isLoading) return;
      const allSelectedAccountAddresses = accounts.map(
        ({ address }) => address,
      );
      onSelectAddress(allSelectedAccountAddresses);
    };

    const unselectAll = () => {
      if (isLoading) return;
      onSelectAddress([]);
    };

    const onPress = () => {
      areAllAccountsSelected ? unselectAll() : selectAll();
    };

    return (
      <View>
        <Checkbox
          style={styles.selectAll}
          label={strings('accounts.select_all')}
          isIndeterminate={areSomeSelectedButNotAll}
          isChecked={areAllAccountsSelected}
          onPress={onPress}
        ></Checkbox>
      </View>
    );
  }, [
    areAllAccountsSelected,
    accounts,
    isLoading,
    onSelectAddress,
    selectedAddresses?.length,
    styles.selectAll,
  ]);

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
          {...generateTestId(
            Platform,
            ConnectAccountModalSelectorsIDs.SELECT_MULTI_BUTTON,
          )}
        />
      </View>
    );
  }, [isLoading, onUserAction, selectedAddresses, styles]);

  const renderAccountConnectMultiSelector = useCallback(
    () => (
      <View style={styles.container}>
        <SheetHeader
          title={
            isMutichainVersion1Enabled
              ? strings('accounts.edit_accounts_title')
              : strings('accounts.connect_accounts_title')
          }
          onBack={onBack}
        />
        <View style={styles.body}>
          {!isMutichainVersion1Enabled && (
            <TagUrl
              imageSource={favicon}
              label={urlWithProtocol}
              iconName={secureIcon}
            />
          )}
          <Text style={styles.description}>
            {isMutichainVersion1Enabled
              ? strings('accounts.select_accounts_description')
              : strings('accounts.connect_description')}
          </Text>
          {isMutichainVersion1Enabled && renderSelectAllCheckbox()}
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
        {connection?.originatorInfo?.apiVersion && (
          <View style={styles.sdkInfoContainer}>
            <View style={styles.sdkInfoDivier} />
            <Text color={TextColor.Muted}>
              SDK {connection?.originatorInfo?.platform} v
              {connection?.originatorInfo?.apiVersion}
            </Text>
          </View>
        )}
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
      </View>
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
      connection,
      styles.sdkInfoContainer,
      styles.container,
      styles.sdkInfoDivier,
      onBack,
      renderSelectAllCheckbox,
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
