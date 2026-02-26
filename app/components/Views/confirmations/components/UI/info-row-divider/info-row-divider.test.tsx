import React from 'react';
import { lightTheme } from '@metamask/design-tokens';
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
            "backgroundColor": "${lightTheme.colors.border.muted}",
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
