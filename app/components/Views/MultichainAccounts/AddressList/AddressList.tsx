import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { InteractionManager, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { FlashList } from '@shopify/flash-list';

import { useStyles } from '../../../hooks/useStyles';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  selectInternalAccountListSpreadByScopesByGroupId,
  selectInternalAccountsByGroupId,
} from '../../../../selectors/multichainAccounts/accounts';
import {
  IconName,
  Skeleton,
  toast,
} from '@metamask/design-system-react-native';
import MultichainAddressRow, {
  MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID,
} from '../../../../component-library/components-temp/MultichainAccounts/MultichainAddressRow';
import { AddressListIds } from './AddressList.testIds';
import {
  useParams,
  createNavigationDetails,
} from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';

import styleSheet from './styles';
import type { AddressListProps, AddressItem } from './types';
import ClipboardManager from '../../../../core/ClipboardManager';
import getHeaderCompactStandardNavbarOptions from '../../../../component-library/components-temp/HeaderCompactStandard/getHeaderCompactStandardNavbarOptions';
import { strings } from '../../../../../locales/i18n';
import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import {
  getAddressListViewedAccountType,
  trackAddressListViewed,
} from '../../../../util/analytics/addressListViewedTracking';

export const createAddressListNavigationDetails =
  createNavigationDetails<AddressListProps>(
    Routes.MULTICHAIN_ACCOUNTS.ADDRESS_LIST,
  );

/**
 * AddressList component displays a list of addresses spread by scopes.
 *
 * @returns {JSX.Element} The rendered component.
 */
export const AddressList = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useAnalytics();

  const { groupId, title, source, onLoad } = useParams<AddressListProps>();

  const hasCompletedLoadTraceRef = useRef(false);

  // Defer mounting the FlashList (14+ native rows with AvatarNetwork,
  // ButtonIcon, etc.) until interactions (e.g. the native push transition)
  // have settled, so the first render stays cheap. A lightweight skeleton is
  // shown until then.
  const [isListReady, setIsListReady] = useState(false);
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setIsListReady(true);
    });
    return () => handle.cancel();
  }, []);

  const completeLoadTrace = useCallback(() => {
    if (hasCompletedLoadTraceRef.current) {
      return;
    }

    hasCompletedLoadTraceRef.current = true;
    onLoad?.();
  }, [onLoad]);

  useFocusEffect(useCallback(() => completeLoadTrace, [completeLoadTrace]));

  useEffect(() => completeLoadTrace, [completeLoadTrace]);

  const selectInternalAccountsSpreadByScopes = useSelector(
    selectInternalAccountListSpreadByScopesByGroupId,
  );
  const internalAccountsSpreadByScopes =
    selectInternalAccountsSpreadByScopes(groupId);

  const selectInternalAccountsByGroup = useSelector(
    selectInternalAccountsByGroupId,
  );
  const internalAccounts = selectInternalAccountsByGroup(groupId);

  const hasTrackedViewRef = useRef(false);

  useEffect(() => {
    if (hasTrackedViewRef.current || !source) {
      return;
    }

    hasTrackedViewRef.current = true;

    trackAddressListViewed(trackEvent, createEventBuilder, {
      source,
      account_type: getAddressListViewedAccountType(internalAccounts),
    });
  }, [source, internalAccounts, trackEvent, createEventBuilder]);

  const renderAddressItem = useCallback(
    ({ item }: { item: AddressItem }) => {
      const copyAddressToClipboard = async () => {
        await ClipboardManager.setString(item.account.address);

        trackEvent(
          createEventBuilder(EVENT_NAME.ADDRESS_COPIED)
            .addProperties({
              location: 'address-list',
              chain_id_caip: item.scope,
            })
            .build(),
        );
      };
      return (
        <MultichainAddressRow
          chainId={item.scope}
          networkName={item.networkName}
          address={item.account.address}
          copyParams={{
            callback: async () => {
              await copyAddressToClipboard();
              toast({
                title: strings('notifications.address_copied_to_clipboard'),
                hasNoTimeout: false,
              });
            },
          }}
          icons={[
            {
              name: IconName.QrCode,
              callback: () => {
                navigation.navigate(
                  Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
                  {
                    screen:
                      Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR,
                    params: {
                      address: item.account.address,
                      networkName: item.networkName,
                      chainId: item.scope,
                      groupId,
                      location: 'address-list',
                      account: item.account,
                    },
                  },
                );
              },
              testId: `${MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID}-${item.scope}`,
            },
          ]}
        />
      );
    },
    [navigation, groupId, trackEvent, createEventBuilder],
  );

  useLayoutEffect(() => {
    if (title) {
      navigation.setOptions({
        ...getHeaderCompactStandardNavbarOptions({
          title,
          onBack: () => navigation.goBack(),
          backButtonProps: { testID: AddressListIds.GO_BACK },
          includesTopInset: true,
        }),
        headerShown: true,
      });
    }
  }, [navigation, title]);

  if (!isListReady) {
    return (
      <View style={styles.safeArea}>
        {internalAccountsSpreadByScopes.slice(0, 6).map((item) => (
          <View key={item.scope} style={styles.skeletonRow}>
            <Skeleton height={48} width="100%" />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <FlashList
        data={internalAccountsSpreadByScopes}
        keyExtractor={(item) => item.scope}
        renderItem={renderAddressItem}
        onLoad={completeLoadTrace}
      />
    </View>
  );
};
