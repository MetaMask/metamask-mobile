import React, { useCallback, useEffect, useRef } from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useStore } from 'react-redux';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { AccountGroupObject } from '@metamask/account-tree-controller';
import type {
  AppNavigationProp,
  RootStackParamList,
} from '../../../core/NavigationService/types';
import type { RootState } from '../../../reducers';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  ManageAccountsViewedSource,
  buildManageAccountsViewedProperties,
} from '../../../core/Analytics/events/accounts';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { selectAccountListStats } from '../../../selectors/multichainAccounts/manageAccounts';
import useManageAccountsView from './useManageAccountsView';
import ManageAccountsView from './ManageAccountsView';

/**
 * Connected Manage Accounts screen — the component registered in the AppFlow
 * navigator (`Routes.MANAGE_ACCOUNTS_VIEW`). Sourcing lives in
 * `useManageAccountsView`; visuals and the prop contract live in the
 * presentational `ManageAccountsView`. Navigation stays at this level and is
 * injected into the hook so its Engine-backed handlers remain testable.
 */
const ManageAccounts = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { params } =
    useRoute<RouteProp<RootStackParamList, 'ManageAccountsView'>>();
  const source = params?.source ?? ManageAccountsViewedSource.AccountList;
  const { trackEvent, createEventBuilder } = useAnalytics();
  // The totals are read from the store when the screen opens rather than
  // through `useSelector`: they describe that one moment, and a subscription
  // would re-render this screen every time an account is hidden or removed
  // from it.
  const store = useStore<RootState>();
  const hasTrackedView = useRef(false);

  useEffect(() => {
    // Mount-only. A hide toggle or a removal changes the totals while the
    // screen is open, and none of that is a second view.
    if (hasTrackedView.current) {
      return;
    }
    hasTrackedView.current = true;

    // Counts walk the whole account tree, hidden groups included, which is what
    // the event's properties are specified to mean.
    const stats = selectAccountListStats(store.getState());

    trackEvent(
      createEventBuilder(MetaMetricsEvents.MANAGE_ACCOUNTS_VIEWED)
        .addProperties(buildManageAccountsViewedProperties(source, stats))
        .build(),
    );
  }, [createEventBuilder, source, store, trackEvent]);

  const {
    sections,
    isHiddenByGroupId,
    onToggleHidden,
    onRemoveAccount,
    onAddAccount,
    avatarAccountType,
  } = useManageAccountsView({
    navigateToRemoveAccount: useCallback(
      (account: InternalAccount, accountGroup: AccountGroupObject) => {
        navigation.navigate(Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS, {
          screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.REMOVE_ACCOUNT,
          params: { account, accountGroup },
        });
      },
      [navigation],
    ),
  });

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleAddWallet = useCallback(() => {
    navigation.navigate(Routes.SHEET.ADD_WALLET);
  }, [navigation]);

  return (
    <ManageAccountsView
      sections={sections}
      isHiddenByGroupId={isHiddenByGroupId}
      onToggleHidden={onToggleHidden}
      onRemoveAccount={onRemoveAccount}
      onAddAccount={onAddAccount}
      onAddWallet={handleAddWallet}
      avatarAccountType={avatarAccountType}
      onBack={handleBack}
    />
  );
};

export default ManageAccounts;
