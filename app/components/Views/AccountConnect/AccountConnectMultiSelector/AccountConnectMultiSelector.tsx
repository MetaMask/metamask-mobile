// Third party dependencies.
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import SheetActions from '../../../../component-library/components-temp/SheetActions';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../../locales/i18n';
import TagUrl from '../../../../component-library/components/Tags/TagUrl';
import Text from '../../../../component-library/components/Text';
import { useStyles } from '../../../../component-library/hooks';
import ButtonPrimary, {
  ButtonPrimaryVariant,
} from '../../../../component-library/components/Buttons/ButtonPrimary';
import ButtonSecondary, {
  ButtonSecondaryVariant,
} from '../../../../component-library/components/Buttons/ButtonSecondary';
import { ButtonBaseSize } from '../../../../component-library/components/Buttons/ButtonBase';
import AccountSelectorList from '../../../UI/AccountSelectorList';
import ButtonLink from '../../../../component-library/components/Buttons/ButtonLink';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { ANALYTICS_EVENT_OPTS } from '../../../../util/analytics';

// Internal dependencies.
import styleSheet from './AccountConnectMultiSelector.styles';
import { AccountConnectMultiSelectorProps } from './AccountConnectMultiSelector.types';

const AccountConnectMultiSelector = ({
  accounts,
  ensByAccountAddress,
  selectedAddresses,
  onSelectAddress,
  isLoading,
  onDismissSheetWithCallback,
  onConnect,
  onCreateAccount,
  hostname,
  favicon,
  secureIcon,
}: AccountConnectMultiSelectorProps) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();

  const onOpenImportAccount = useCallback(() => {
    onDismissSheetWithCallback(() => {
      navigation.navigate('ImportPrivateKeyView');
      // Is this where we want to track importing an account or within ImportPrivateKeyView screen?
      AnalyticsV2.trackEvent(
        ANALYTICS_EVENT_OPTS.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
      );
    });
  }, [navigation, onDismissSheetWithCallback]);

  const onOpenConnectHardwareWallet = useCallback(() => {
    onDismissSheetWithCallback(() => {
      navigation.navigate('ConnectQRHardwareFlow');
      // Is this where we want to track connecting a hardware wallet or within ConnectQRHardwareFlow screen?
      AnalyticsV2.trackEvent(
        AnalyticsV2.ANALYTICS_EVENTS.CONNECT_HARDWARE_WALLET,
      );
    });
  }, [navigation, onDismissSheetWithCallback]);

  const renderSheetActions = useCallback(
    () => (
      <SheetActions
        actions={[
          {
            label: strings('accounts.create_new_account'),
            onPress: onCreateAccount,
            isLoading,
          },
          {
            label: strings('accounts.import_account'),
            onPress: onOpenImportAccount,
            disabled: isLoading,
          },
          {
            label: strings('accounts.connect_hardware'),
            onPress: onOpenConnectHardwareWallet,
            disabled: isLoading,
          },
        ]}
      />
    ),
    [
      isLoading,
      onCreateAccount,
      onOpenImportAccount,
      onOpenConnectHardwareWallet,
    ],
  );

  const renderSelectAllButton = useCallback(
    () =>
      Boolean(accounts.length) && (
        <ButtonLink
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
        >
          {strings('accounts.select_all')}
        </ButtonLink>
      ),
    [accounts, isLoading, onSelectAddress, styles],
  );

  const renderCtaButtons = useCallback(() => {
    const isConnectDisabled = Boolean(!selectedAddresses.length) || isLoading;

    return (
      <View style={styles.ctaButtonsContainer}>
        <ButtonSecondary
          variant={ButtonSecondaryVariant.Normal}
          label={strings('accounts.cancel')}
          onPress={() => onDismissSheetWithCallback()}
          size={ButtonBaseSize.Lg}
          style={styles.button}
        />
        <View style={styles.buttonSeparator} />
        <ButtonPrimary
          variant={ButtonPrimaryVariant.Normal}
          label={strings('accounts.connect_with_count', {
            countLabel: selectedAddresses.length
              ? ` (${selectedAddresses.length})`
              : '',
          })}
          onPress={onConnect}
          size={ButtonBaseSize.Lg}
          style={{
            ...styles.button,
            ...(isConnectDisabled && styles.disabled),
          }}
          disabled={isConnectDisabled}
        />
      </View>
    );
  }, [
    onConnect,
    isLoading,
    selectedAddresses,
    onDismissSheetWithCallback,
    styles,
  ]);

  return (
    <>
      <SheetHeader title={strings('accounts.connect_accounts_title')} />
      <View style={styles.body}>
        <TagUrl imageSource={favicon} label={hostname} iconName={secureIcon} />
        <Text style={styles.description}>
          {strings('accounts.connect_description')}
        </Text>
        {renderSelectAllButton()}
      </View>
      <AccountSelectorList
        onSelectAccount={(accAddress) => {
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
        }}
        accounts={accounts}
        ensByAccountAddress={ensByAccountAddress}
        isLoading={isLoading}
        selectedAddresses={selectedAddresses}
        isMultiSelect
      />
      {renderSheetActions()}
      <View style={styles.body}>{renderCtaButtons()}</View>
    </>
  );
};

export default AccountConnectMultiSelector;
