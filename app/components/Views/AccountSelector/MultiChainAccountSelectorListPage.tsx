import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import Engine from '../../../core/Engine';
import { selectSelectedAccountGroup } from '../../../selectors/multichainAccounts/accountTreeController';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import MultichainAccountSelectorList from '../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { ActivityIndicator, View } from 'react-native';
import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { useAccountsOperationsLoadingStates } from '../../../util/accounts/useAccountsOperationsLoadingStates';
import { Box } from '../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../UI/Box/box.types';
import Text from '../../../component-library/components/Texts/Text';
// import MultichainAddWalletActions from '../../../component-library/components-temp/MultichainAccounts/MultichainAddWalletActions/MultichainAddWalletActions';

export const createMultichainAccountSelectorListPageNavigationDetails =
  createNavigationDetails(
    Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_SELECTOR_LIST_PAGE,
  );

const MultiChainAccountSelectorListPage = () => {
  // const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const { styles } = useStyles(styleSheet, {});

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

  const handleAddAccount = () => {
    // eslint-disable-next-line no-console
    console.log('handleAddAccount');
  };

  // const renderMultichainAddWalletActions = useCallback(
  //   () => <MultichainAddWalletActions onBack={} />,
  //   [],
  // );

  const _onSelectMultichainAccount = useCallback(
    (accountGroup: AccountGroupObject) => {
      Engine.context.AccountTreeController.setSelectedAccountGroup(
        accountGroup.id,
      );
      // trackEvent(
      //   createEventBuilder(MetaMetricsEvents.SWITCHED_ACCOUNT)
      //     .addProperties({
      //       source: 'Wallet Tab',
      //       number_of_accounts: accounts?.length,
      //     })
      //     .build(),
      // );
    },
    [],
  );
  return selectedAccountGroup ? (
    <SafeAreaView style={styles.container}>
      <HeaderBase
        style={styles.header}
        startAccessory={
          <ButtonLink
            // testID={WalletDetailsIds.BACK_BUTTON}
            labelTextVariant={TextVariant.BodyMDMedium}
            label={<Icon name={IconName.ArrowLeft} size={IconSize.Md} />}
            onPress={() => navigation.goBack()}
          />
        }
      >
        {strings('accounts.accounts_title')}
      </HeaderBase>
      <MultichainAccountSelectorList
        onSelectAccount={_onSelectMultichainAccount}
        selectedAccountGroups={[selectedAccountGroup]}
        // testID={AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID}
        // setKeyboardAvoidingViewEnabled={}
      />
      <View style={styles.footer}>
        <Button
          variant={ButtonVariants.Secondary}
          isDisabled={isAccountSyncingInProgress}
          style={styles.button}
          label={
            <Box
              alignItems={AlignItems.center}
              justifyContent={JustifyContent.center}
              flexDirection={FlexDirection.Row}
              gap={8}
            >
              {isAccountSyncingInProgress && <ActivityIndicator size="small" />}
              <Text variant={TextVariant.BodyMDBold}>{buttonLabel}</Text>
            </Box>
          }
          onPress={handleAddAccount}
        />
      </View>
    </SafeAreaView>
  ) : null;
};

export default MultiChainAccountSelectorListPage;
