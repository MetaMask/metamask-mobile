// Third party dependencies.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, SafeAreaView } from 'react-native';
import { useSelector } from 'react-redux';

// External dependencies.
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import Text, {
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import HelpText, {
  HelpTextSeverity,
} from '../../../../../component-library/components/Form/HelpText';

// Internal dependencies.
import { AccountGroupId } from '@metamask/account-api';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../../../../e2e/selectors/Browser/ConnectAccountBottomSheet.selectors';
import { AccountListBottomSheetSelectorsIDs } from '../../../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import styleSheet from '../../../AccountConnect/AccountConnectMultiSelector/AccountConnectMultiSelector.styles';
import { ConnectedAccountsSelectorsIDs } from '../../../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';
import { USER_INTENT } from '../../../../../constants/permissions';
import { ConnectionProps } from '../../../../../core/SDKConnect/Connection';
import MultichainAccountSelectorList from '../../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList';
import { AccountGroupWithInternalAccounts } from '../../../../../selectors/multichainAccounts/accounts.type';
import { selectAccountGroups } from '../../../../../selectors/multichainAccounts/accountTreeController';

interface MultichainAccountConnectMultiSelectorProps {
  accountGroups: AccountGroupWithInternalAccounts[];
  defaultSelectedAccountGroupIds: AccountGroupId[];
  isLoading: boolean;
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
  defaultSelectedAccountGroupIds,
  isLoading,
  screenTitle,
  onBack,
  onSubmit,
  isRenderedAsBottomSheet,
  showDisconnectAllButton,
  hostname,
  connection,
}: MultichainAccountConnectMultiSelectorProps) => {
  const { styles } = useStyles(styleSheet, { isRenderedAsBottomSheet });

  const [selectedAccountGroupIds, setSelectedAccountGroupIds] = useState<
    AccountGroupId[]
  >([]);

  const accountGroups = useSelector(selectAccountGroups);

  const selectedAccountGroups = useMemo(
    () =>
      accountGroups.filter((group) =>
        selectedAccountGroupIds.includes(group.id),
      ),
    [accountGroups, selectedAccountGroupIds],
  );

  useEffect(() => {
    setSelectedAccountGroupIds(defaultSelectedAccountGroupIds);
  }, [setSelectedAccountGroupIds, defaultSelectedAccountGroupIds]);

  const onSelectAccountGroupId = useCallback(
    (accountGroup: AccountGroupObject) => {
      const updatedSelectedAccountGroupIds = selectedAccountGroupIds.filter(
        (selectedAccountGroupId: AccountGroupId) =>
          selectedAccountGroupId !== accountGroup.id,
      );

      if (
        updatedSelectedAccountGroupIds.length === selectedAccountGroupIds.length
      ) {
        setSelectedAccountGroupIds([
          ...selectedAccountGroupIds,
          accountGroup.id,
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

  const areAnyAccountsSelected = selectedAccountGroupIds?.length !== 0;
  const areNoAccountsSelected = selectedAccountGroupIds?.length === 0;

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

  return (
    <SafeAreaView>
      <View style={styles.container}>
        <SheetHeader
          title={screenTitle || strings('accounts.connect_accounts_title')}
          onBack={onBack}
        />
        <MultichainAccountSelectorList
          onSelectAccount={onSelectAccountGroupId}
          selectedAccountGroups={selectedAccountGroups}
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
  );
};

export default MultichainAccountConnectMultiSelector;
