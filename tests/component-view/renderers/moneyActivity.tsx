import '../mocks';
import React from 'react';
import MoneyActivityView from '../../../app/components/UI/Money/Views/MoneyActivityView';
import { MoneyApiActivityDetailsView } from '../../../app/components/UI/Money/Views/MoneyApiActivityDetailsView/MoneyApiActivityDetailsView';
import Routes from '../../../app/constants/navigation/Routes';
import { renderScreenWithRoutes } from '../render';
import { moneyActivityViewState } from '../presets/moneyActivity';

export function renderMoneyActivityView({
  historicalValuationsEnabled,
}: {
  historicalValuationsEnabled: boolean;
}): ReturnType<typeof renderScreenWithRoutes> {
  const state = moneyActivityViewState({ historicalValuationsEnabled });

  return renderScreenWithRoutes(
    MoneyActivityView as unknown as React.ComponentType,
    { name: Routes.MONEY.ACTIVITY },
    [
      {
        name: Routes.MONEY.CARD_TRANSACTION_DETAILS,
        Component:
          MoneyApiActivityDetailsView as unknown as React.ComponentType<object>,
      },
    ],
    { state },
  );
}
