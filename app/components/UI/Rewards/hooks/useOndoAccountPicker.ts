import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import type { AccountGroupObject } from '@metamask/account-tree-controller';
import type { BottomSheetRef } from '@metamask/design-system-react-native';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import type { AccountPickerConfig } from '../components/Campaigns/OndoPortfolio';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { selectInternalAccounts } from '../../../../selectors/accountsController';

export const useOndoAccountPicker = (campaignId: string) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [pendingPicker, setPendingPicker] =
    useState<AccountPickerConfig | null>(null);
  const sheetRef = useRef<BottomSheetRef>(null);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const internalAccounts = useSelector(selectInternalAccounts);

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setPendingPicker(null);
    });
    return unsubscribe;
  }, [navigation]);

  const handleGroupSelect = useCallback(
    (group: AccountGroupObject) => {
      if (!pendingPicker) return;
      Engine.context.AccountTreeController.setSelectedAccountGroup(group.id);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SWITCHED_ACCOUNT)
          .addProperties({
            source: 'Rewards',
            number_of_accounts: internalAccounts?.length,
          })
          .build(),
      );
      sheetRef.current?.onCloseBottomSheet(() => {
        const { row, tokenDecimals } = pendingPicker;
        setPendingPicker(null);
        navigation.navigate(Routes.REWARDS_ONDO_CAMPAIGN_RWA_ASSET_SELECTOR, {
          mode: 'swap',
          srcTokenAsset: row.tokenAsset,
          srcTokenSymbol: row.tokenSymbol,
          srcTokenName: row.tokenName,
          srcTokenDecimals: tokenDecimals,
          campaignId,
        });
      });
    },
    [
      pendingPicker,
      navigation,
      campaignId,
      trackEvent,
      createEventBuilder,
      internalAccounts?.length,
    ],
  );

  return { pendingPicker, setPendingPicker, sheetRef, handleGroupSelect };
};
