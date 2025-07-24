import React from 'react';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import withRampAndDepositSDK from '../../utils/withRampAndDepositSDK';

function renderDepositTestComponent(
  Component: React.ComponentType,
  route: string,
) {
  return renderScreen(
    withRampAndDepositSDK(Component),
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
