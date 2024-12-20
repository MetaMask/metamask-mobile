// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { View, SafeAreaView } from 'react-native';
import { isEqual } from 'lodash';

// External dependencies.
import { strings } from '../../../../../locales/i18n';
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
import HelpText, {
  HelpTextSeverity,
} from '../../../../component-library/components/Form/HelpText';
import Engine from '../../../../core/Engine';

// Internal dependencies.
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectAccountBottomSheet.selectors';
import { AccountListBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import AddAccountActions from '../../AddAccountActions';
import styleSheet from './AccountConnectMultiSelector.styles';
import {
  AccountConnectMultiSelectorProps,
  AccountConnectMultiSelectorScreens,
} from './AccountConnectMultiSelector.types';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { isMultichainVersion1Enabled } from '../../../../util/networks';
import Checkbox from '../../../../component-library/components/Checkbox';
import { ConnectedAccountsSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';

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
  hostname,
  connection,
  onBack,
  screenTitle,
  isRenderedAsBottomSheet = true,
  showDisconnectAllButton = true,
  onPrimaryActionButtonPress,
}: AccountConnectMultiSelectorProps) => {
  const { styles } = useStyles(styleSheet, { isRenderedAsBottomSheet });
  const { navigate } = useNavigation();
  const [screen, setScreen] = useState<AccountConnectMultiSelectorScreens>(
    AccountConnectMultiSelectorScreens.AccountMultiSelector,
  );
  const sortedSelectedAddresses = [...selectedAddresses].sort((a, b) =>
    a.localeCompare(b),
  );
  const [originalSelectedAddresses] = useState<string[]>(
    sortedSelectedAddresses,
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

  const onRevokeAllHandler = useCallback(async () => {
    await Engine.context.PermissionController.revokeAllPermissions(hostname);
    navigate('PermissionsManager');
  }, [hostname, navigate]);

  const toggleRevokeAllAccountPermissionsModal = useCallback(() => {
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.REVOKE_ALL_ACCOUNT_PERMISSIONS,
      params: {
        hostInfo: {
          metadata: {
            origin: urlWithProtocol && new URL(urlWithProtocol).hostname,
          },
        },
        onRevokeAll: !isRenderedAsBottomSheet && onRevokeAllHandler,
      },
    });
  }, [navigate, urlWithProtocol, isRenderedAsBottomSheet, onRevokeAllHandler]);

  const renderSelectAllButton = useCallback(
    () =>
      Boolean(accounts.length) &&
      !isMultichainVersion1Enabled && (
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
          testID={ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON}
        />
      ),
    [accounts, isLoading, onSelectAddress, styles],
  );

  const renderUnselectAllButton = useCallback(
    () =>
      Boolean(accounts.length) &&
      !isMultichainVersion1Enabled && (
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

  const areAnyAccountsSelected = selectedAddresses?.length !== 0;
  const areNoAccountsSelected = selectedAddresses?.length === 0;

  const renderSelectAllCheckbox = useCallback((): React.JSX.Element | null => {
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
    areAnyAccountsSelected,
    accounts,
    isLoading,
    onSelectAddress,
    styles.selectAll,
  ]);

  const renderCtaButtons = useCallback(() => {
    const isConnectDisabled = Boolean(!selectedAddresses.length) || isLoading;
    const areUpdateDisabled = isEqual(
      [...selectedAddresses].sort((a, b) => a.localeCompare(b)),
      originalSelectedAddresses,
    );

    return (
      <View style={styles.ctaButtonsContainer}>
        <View style={styles.connectOrUpdateButtonContainer}>
          {!isMultichainVersion1Enabled && (
            <Button
              variant={ButtonVariants.Secondary}
              label={strings('accounts.cancel')}
              onPress={() => onUserAction(USER_INTENT.Cancel)}
              size={ButtonSize.Lg}
              style={styles.button}
            />
          )}
          {!isMultichainVersion1Enabled && (
            <View style={styles.buttonSeparator} />
          )}
          {areAnyAccountsSelected && (
            <Button
              variant={ButtonVariants.Primary}
              label={strings(
                isMultichainVersion1Enabled
                  ? 'networks.update'
                  : 'accounts.connect_with_count',
                {
                  countLabel: selectedAddresses.length
                    ? ` (${selectedAddresses.length})`
                    : '',
                },
              )}
              onPress={() => {
                if (!isMultichainVersion1Enabled) {
                  onUserAction(USER_INTENT.Confirm);
                } else {
                  onPrimaryActionButtonPress
                    ? onPrimaryActionButtonPress()
                    : onUserAction(USER_INTENT.Confirm);
                }
              }}
              size={ButtonSize.Lg}
              style={{
                ...styles.button,
                ...((isConnectDisabled || areUpdateDisabled) &&
                  styles.disabled),
              }}
              disabled={isConnectDisabled || areUpdateDisabled}
              testID={ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON}
            />
          )}
        </View>
        {isMultichainVersion1Enabled &&
          areNoAccountsSelected &&
          showDisconnectAllButton && (
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
                  onPress={toggleRevokeAllAccountPermissionsModal}
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
    );
  }, [
    areAnyAccountsSelected,
    isLoading,
    onUserAction,
    selectedAddresses,
    styles,
    areNoAccountsSelected,
    hostname,
    toggleRevokeAllAccountPermissionsModal,
    showDisconnectAllButton,
    onPrimaryActionButtonPress,
    originalSelectedAddresses,
  ]);

  const renderAccountConnectMultiSelector = useCallback(
    () => (
      <SafeAreaView>
        <View style={styles.container}>
          <SheetHeader
            title={
              isMultichainVersion1Enabled
                ? screenTitle
                : strings('accounts.connect_accounts_title')
            }
            onBack={onBack}
          />
          <View style={styles.body}>
            {!isMultichainVersion1Enabled && (
              <TagUrl
                imageSource={favicon}
                label={urlWithProtocol}
                iconName={secureIcon}
              />
            )}
            <Text style={styles.description}>
              {isMultichainVersion1Enabled
                ? accounts?.length > 0 &&
                  strings('accounts.select_accounts_description')
                : strings('accounts.connect_description')}
            </Text>
            {isMultichainVersion1Enabled &&
              accounts?.length > 0 &&
              renderSelectAllCheckbox()}
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
              testID={AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID}
            />
          </View>
          <View style={styles.body}>{renderCtaButtons()}</View>
        </View>
      </SafeAreaView>
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
      screenTitle,
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
