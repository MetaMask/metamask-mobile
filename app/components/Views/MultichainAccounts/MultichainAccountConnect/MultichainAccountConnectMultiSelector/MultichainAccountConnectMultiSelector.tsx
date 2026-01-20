// Third party dependencies.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
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
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../AccountConnect/ConnectAccountBottomSheet.testIds';
import { AccountListBottomSheetSelectorsIDs } from '../../../AccountSelector/AccountListBottomSheet.testIds';
import styleSheet from './MultichainAccountConnectMultiSelector.styles';
import { ConnectedAccountsSelectorsIDs } from '../../../AccountConnect/ConnectedAccountModal.testIds';
import { USER_INTENT } from '../../../../../constants/permissions';
import { ConnectionProps } from '../../../../../core/SDKConnect/Connection';
import MultichainAccountSelectorList from '../../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList';
import { AccountGroupWithInternalAccounts } from '../../../../../selectors/multichainAccounts/accounts.type';
import { selectAccountGroups } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { SafeAreaView } from 'react-native-safe-area-context';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';

interface MultichainAccountConnectMultiSelectorProps {
  accountGroups: AccountGroupWithInternalAccounts[];
  defaultSelectedAccountGroupIds: AccountGroupId[];
  isLoading: boolean;
  onUserAction: (intent: USER_INTENT) => void;
  onSubmit: (accountGroupIds: AccountGroupId[]) => void;
  isRenderedAsBottomSheet: boolean;
  showDisconnectAllButton: boolean;
  hostname: string;
  connection?: ConnectionProps;
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
  const navigation = useNavigation();
  const [selectedAccountGroupIdsSet, setSelectedAccountGroupIdsSet] = useState<
    Set<AccountGroupId>
  >(() => new Set());

  useEffect(() => {
    setSelectedAccountGroupIdsSet(new Set(defaultSelectedAccountGroupIds));
  }, [defaultSelectedAccountGroupIds]);

  const accountGroups = useSelector(selectAccountGroups);

  const onSelectAccountGroupId = useCallback(
    (accountGroup: AccountGroupObject) => {
      setSelectedAccountGroupIdsSet((prev) => {
        const next = new Set(prev);
        if (next.has(accountGroup.id)) {
          next.delete(accountGroup.id);
        } else {
          next.add(accountGroup.id);
        }
        return next;
      });
    },
    [],
  );

  const areAnyAccountsSelected = selectedAccountGroupIdsSet.size !== 0;
  const areNoAccountsSelected = selectedAccountGroupIdsSet.size === 0;

  const selectedAccountGroups = useMemo(
    () => accountGroups.filter((g) => selectedAccountGroupIdsSet.has(g.id)),
    [accountGroups, selectedAccountGroupIdsSet],
  );

  const handleSubmit = useCallback(() => {
    onSubmit(Array.from(selectedAccountGroupIdsSet));
  }, [onSubmit, selectedAccountGroupIdsSet]);

  const handleDisconnect = useCallback(() => {
    onSubmit([]);
    navigation.navigate(Routes.BROWSER.HOME);
  }, [onSubmit, navigation]);

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <SheetHeader
          title={screenTitle || strings('accounts.connect_accounts_title')}
          onBack={onBack}
        />
        <MultichainAccountSelectorList
          onSelectAccount={onSelectAccountGroupId}
          selectedAccountGroups={selectedAccountGroups}
          testID={AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID}
          showCheckbox
        />
        {connection?.originatorInfo?.apiVersion && (
          <View style={styles.sdkInfoContainer}>
            <View style={styles.sdkInfoDivier} />
            <Text color={TextColor.Muted}>
              {strings('permissions.sdk_connection', {
                originator_platform: connection?.originatorInfo?.platform,
                api_version: connection?.originatorInfo?.apiVersion,
              })}
            </Text>
          </View>
        )}
        <View style={styles.body}>{renderCtaButtons()}</View>
      </View>
    </SafeAreaView>
  );
};

export default MultichainAccountConnectMultiSelector;
