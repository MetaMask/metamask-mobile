import React from 'react';
import { mockTheme } from '../../../../../../util/theme';
import { stakingDepositConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import InfoRowDivider from './info-row-divider';

describe('InfoRowDivider', () => {
  it('matches snapshot', async () => {
    const { toJSON } = renderWithProvider(<InfoRowDivider />, {
      state: stakingDepositConfirmationState,
    });

    const result = toJSON();
    expect(result).toBeTruthy();
    if (result && !Array.isArray(result)) {
      expect(result.props.style).toEqual({
        backgroundColor: mockTheme.colors.border.muted,
        height: 1,
        marginLeft: -8,
        marginRight: -8,
        marginVertical: 8,
      });
    }
  });
});
