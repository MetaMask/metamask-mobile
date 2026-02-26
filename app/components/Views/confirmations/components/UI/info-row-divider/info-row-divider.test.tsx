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
    expect(result?.props?.style?.backgroundColor).toBe(mockTheme.colors.border.muted);
  });
});
