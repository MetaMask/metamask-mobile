import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import {
  typedSignV3ConfirmationState,
  typedSignV4ConfirmationState,
} from '../../../../../../../util/test/confirm-data-helpers';
import { InfoSectionOriginAndDetails } from './info-section-origin-and-details';

describe('InfoSectionOriginAndDetails', () => {
  it('renders origin', () => {
    const { getByText } = renderWithProvider(<InfoSectionOriginAndDetails />, {
      state: typedSignV4ConfirmationState,
    });

    expect(getByText('Request from')).toBeTruthy();
    expect(getByText('metamask.github.io')).toBeTruthy();
  });

  it('renders "Interacting with" if associated with a valid verifying contract', () => {
    const { getByText } = renderWithProvider(<InfoSectionOriginAndDetails />, {
      state: typedSignV4ConfirmationState,
    });

    expect(getByText('Request from')).toBeTruthy();
  });

  it('renders Spender if it is a Permit', () => {
    const { getByText } = renderWithProvider(<InfoSectionOriginAndDetails />, {
      state: typedSignV4ConfirmationState,
    });

    expect(getByText('Interacting with')).toBeTruthy();
    expect(getByText('0xCcCCc...ccccC')).toBeTruthy();
  });

  it('does not render Spender if it is not a Permit', () => {
    const { queryByText } = renderWithProvider(<InfoSectionOriginAndDetails />, {
      state: typedSignV3ConfirmationState,
    });

    expect(queryByText('Spender')).toBeNull();
  });
});
