import '../mocks';
import React from 'react';
import Routes from '../../../app/constants/navigation/Routes';
import MoneyAccountStatusView from '../../../app/components/UI/Money/Views/MoneyAccountStatusView';
import { renderComponentViewScreen } from '../render';
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
