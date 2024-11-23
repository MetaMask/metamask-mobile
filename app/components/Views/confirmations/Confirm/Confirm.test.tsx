import React from 'react';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  typedSignV1ConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
import Confirm from './index';

describe('Confirm', () => {
  it('should match snapshot for personal sign', async () => {
    const container = renderWithProvider(<Confirm />, {
      state: personalSignatureConfirmationState,
    });
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot for typed sign v1', async () => {
    const container = renderWithProvider(<Confirm />, {
      state: typedSignV1ConfirmationState,
    });
    expect(container).toMatchSnapshot();
  });
});
