import React from 'react';
import { stakingDepositConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import InfoRowDivider from './info-row-divider';

describe('InfoRowDivider', () => {
  it('matches snapshot', async () => {
    const { toJSON } = renderWithProvider(<InfoRowDivider />, {
      state: stakingDepositConfirmationState,
    });

    expect(toJSON()).toMatchInlineSnapshot(`
      <View
        style={
          {
            "backgroundColor": "#b7bbc866",
            "height": 1,
            "marginLeft": -8,
            "marginRight": -8,
            "marginVertical": 8,
          }
        }
      />
    `);
  });
});
