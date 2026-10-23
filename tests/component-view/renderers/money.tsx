import '../mocks';
import React from 'react';
import Routes from '../../../app/constants/navigation/Routes';
import MoneyAccountStatusView from '../../../app/components/UI/Money/Views/MoneyAccountStatusView';
import { renderComponentViewScreen } from '../render';
import { initialStateMoney } from '../presets/money';

export const renderMoneyAccountStatusView = (
  options: Parameters<typeof initialStateMoney>[0] = {},
) =>
  renderComponentViewScreen(
    MoneyAccountStatusView as unknown as React.ComponentType,
    { name: Routes.MONEY.ACCOUNT_STATUS },
    { state: initialStateMoney(options).build() },
  );
