import React from 'react';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  typedSignV1ConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
import Confirm from './index';

describe('Confirm', () => {
  it('should match snapshot for personal sign', async () => {
    const { getAllByRole, getByText } = renderWithProvider(<Confirm />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Signature request')).toBeDefined();
    expect(getByText('Estimated changes')).toBeDefined();
    expect(
      getByText(
        'You’re signing into a site and there are no predicted changes to your account.',
      ),
    ).toBeDefined();
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getByText('Message')).toBeDefined();
    expect(getByText('Example `personal_sign` message')).toBeDefined();
    expect(getAllByRole('button')).toHaveLength(2);
  });

  it('should match snapshot for typed sign v1', async () => {
    const { getAllByRole, getAllByText, getByText } = renderWithProvider(
      <Confirm />,
      {
        state: typedSignV1ConfirmationState,
      },
    );
    expect(getByText('Signature request')).toBeDefined();
    expect(getByText('Estimated changes')).toBeDefined();
    expect(
      getByText(
        'You’re signing into a site and there are no predicted changes to your account.',
      ),
    ).toBeDefined();
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getAllByText('Message')).toHaveLength(2);
    expect(getByText('Hi, Alice!')).toBeDefined();
    expect(getAllByRole('button')).toHaveLength(2);
  });
});
