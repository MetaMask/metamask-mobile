import React from 'react';
import { stakingDepositConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import InfoRowDivider from './InfoRowDivider';

describe('InfoRowDivider', () => {
  it('matches snapshot', async () => {
    const { toJSON } = renderWithProvider(<InfoRowDivider />, {
      state: stakingDepositConfirmationState,
    });

    expect(toJSON()).toMatchInlineSnapshot(`
      <View
        style={
          {
            "backgroundColor": "#BBC0C566",
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
