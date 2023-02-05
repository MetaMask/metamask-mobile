// Third party dependencies.
import React, { useCallback } from 'react';
import { View } from 'react-native';

// External dependencies.
import SheetActions from '../../../../component-library/components-temp/SheetActions';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../../locales/i18n';
import TagUrl from '../../../../component-library/components/Tags/TagUrl';
import Text from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import AccountSelectorList from '../../../UI/AccountSelectorList';

// Internal dependencies.
import styleSheet from './AccountConnectMultiSelector.styles';
import { AccountConnectMultiSelectorProps } from './AccountConnectMultiSelector.types';
import USER_INTENT from '../../../../constants/permissions';

const AccountConnectMultiSelector = ({
  accounts,
  ensByAccountAddress,
  selectedAddresses,
  onSelectAddress,
  isLoading,
  onUserAction,
  hostname,
  favicon,
  secureIcon,
  isAutoScrollEnabled = true,
}: AccountConnectMultiSelectorProps) => {
  const { styles } = useStyles(styleSheet, {});

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

  const renderSheetActions = useCallback(
    () => (
      <SheetActions
        actions={[
          {
            label: strings('accounts.create_new_account'),
            onPress: () => onUserAction(USER_INTENT.CreateMultiple),
            isLoading,
          },
          {
            label: strings('accounts.import_account'),
            onPress: () => onUserAction(USER_INTENT.Import),
            disabled: isLoading,
          },
          {
            label: strings('accounts.connect_hardware'),
            onPress: () => onUserAction(USER_INTENT.ConnectHW),
            disabled: isLoading,
          },
        ]}
      />
    ),
    [isLoading, onUserAction],
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
        />
      </View>
    );
  }, [isLoading, onUserAction, selectedAddresses, styles]);

  const areAllAccountsSelected = accounts
    .map(({ address }) => address)
    .every((address) => selectedAddresses.includes(address));

  return (
    <>
      <SheetHeader title={strings('accounts.connect_accounts_title')} />
      <View style={styles.body}>
        <TagUrl imageSource={favicon} label={hostname} iconName={secureIcon} />
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
      {renderSheetActions()}
      <View style={styles.body}>{renderCtaButtons()}</View>
    </>
  );
};

export default AccountConnectMultiSelector;
