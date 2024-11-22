import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import NoChangeSimulation from './NoChangeSimulation';

describe('NoChangeSimulation', () => {
  it('should match snapshot', async () => {
    const container = renderWithProvider(<NoChangeSimulation />, {
      state: personalSignatureConfirmationState,
    });
    expect(container).toMatchSnapshot();
  });

  it('should return null if preference useTransactionSimulations is not enabled', async () => {
    const container = renderWithProvider(<NoChangeSimulation />, {
      state: {
        engine: {
          backgroundState: {
            ...personalSignatureConfirmationState,
            PreferencesController: {
              ...personalSignatureConfirmationState.engine.backgroundState
                .PreferencesController,
              useTransactionSimulations: false,
            },
          },
        },
      },
    });
    expect(container).toMatchSnapshot();
  });
});
