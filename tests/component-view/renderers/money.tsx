import '../mocks';
import React from 'react';
import Routes from '../../../app/constants/navigation/Routes';
import MoneyAccountStatusView from '../../../app/components/UI/Money/Views/MoneyAccountStatusView';
import { Pressable } from 'react-native';
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { MoneyModalStack } from '../../../app/components/UI/Money/routes';
import { IS_MONEY_MFA_ENABLED_FLAG_NAME } from '../../../app/lib/Money/feature-flags';
import { FeatureFlagNames } from '../../../app/constants/featureFlags';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import { initialStateMoney } from '../presets/money';

const ENABLED_FLAG = { enabled: true, minimumVersion: '0.0.0' };

export const renderMoneyAccountStatusView = ({
  remoteFeatureFlags,
  ...options
}: Parameters<typeof initialStateMoney>[0] = {}) =>
  renderComponentViewScreen(
    MoneyAccountStatusView as unknown as React.ComponentType,
    { name: Routes.MONEY.ACCOUNT_STATUS },
    {
      state: initialStateMoney({
        ...options,
        remoteFeatureFlags: {
          moneyEnableMoneyAccount: ENABLED_FLAG,
          moneyAccountDebugEnabled: ENABLED_FLAG,
          ...remoteFeatureFlags,
        },
      }).build(),
    },
  );

export const MoneyMfaSheetHostTestIds = {
  OPEN: 'money-mfa-sheet-host-open',
} as const;

const createMoneyMfaSheetHost = (sheet: string) => () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  return (
    <Pressable
      testID={MoneyMfaSheetHostTestIds.OPEN}
      onPress={() =>
        navigation.navigate(Routes.MONEY.MODALS.ROOT, { screen: sheet })
      }
    />
  );
};

/** A host screen whose button opens `sheet` in the real Money modal stack. */
export const renderMoneyMfaSheet = (sheet: string) =>
  renderScreenWithRoutes(
    createMoneyMfaSheetHost(sheet),
    { name: Routes.MONEY.HOME },
    [{ name: Routes.MONEY.MODALS.ROOT, Component: MoneyModalStack }],
    {
      state: initialStateMoney({
        remoteFeatureFlags: {
          moneyEnableMoneyAccount: ENABLED_FLAG,
          [IS_MONEY_MFA_ENABLED_FLAG_NAME]: ENABLED_FLAG,
          [FeatureFlagNames.mfaUiKit]: ENABLED_FLAG,
        },
      }).build(),
    },
  );
