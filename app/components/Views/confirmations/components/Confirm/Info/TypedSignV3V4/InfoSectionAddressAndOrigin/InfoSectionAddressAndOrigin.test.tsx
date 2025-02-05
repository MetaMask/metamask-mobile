import React from 'react';

import renderWithProvider from '../../../../../../../../util/test/renderWithProvider';
import { 
  typedSignV3ConfirmationState, 
  typedSignV4ConfirmationState,
} from '../../../../../../../../util/test/confirm-data-helpers';
import { InfoSectionAddressAndOrigin } from './InfoSectionAddressAndOrigin';

describe('InfoSectionAddressAndOrigin', () => {
  it('renders origin', () => {
    const { getByText } = renderWithProvider(<InfoSectionAddressAndOrigin />, {
      state: typedSignV4ConfirmationState,
    });

    expect(getByText('Request from')).toBeTruthy();
    expect(getByText('metamask.github.io')).toBeTruthy();
  });

  it('renders Spender if it is a Permit', () => {
    const { getByText } = renderWithProvider(<InfoSectionAddressAndOrigin />, {
      state: typedSignV4ConfirmationState,
    });

    expect(getByText('Spender')).toBeTruthy();
  });

  it('does not render Spender if it is not a Permit', () => {
    const { queryByText } = renderWithProvider(<InfoSectionAddressAndOrigin />, {
      state: typedSignV3ConfirmationState,
    });

    expect(queryByText('Spender')).toBeNull();
  });
});
