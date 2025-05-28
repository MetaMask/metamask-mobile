import React from 'react';
import { renderScreen } from '../../../../util/test/renderWithProvider';
import { DepositSDKProvider } from '../sdk';
import { backgroundState } from '../../../../util/test/initial-root-state';

function renderDepositTestComponent(
  Component: React.ComponentType,
  route: string,
) {
  return renderScreen(
    (props) => (
      <DepositSDKProvider>
        <Component {...props} />
      </DepositSDKProvider>
    ),
    {
      name: route,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

export default renderDepositTestComponent;
