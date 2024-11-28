import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import NoChangeSimulation from './NoChangeSimulation';

describe('NoChangeSimulation', () => {
  it('should render text correctly', async () => {
    const { getByText } = renderWithProvider(<NoChangeSimulation />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Estimated changes')).toBeDefined();
    expect(
      getByText(
        'You’re signing into a site and there are no predicted changes to your account.',
      ),
    ).toBeDefined();
  });

  it('should return null if preference useTransactionSimulations is not enabled', async () => {
    const { queryByText } = renderWithProvider(<NoChangeSimulation />, {
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
    expect(queryByText('Estimated changes')).toBeNull();
  });
});
