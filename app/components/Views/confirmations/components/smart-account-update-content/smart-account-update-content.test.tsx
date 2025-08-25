import React from 'react';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { SmartAccountUpdateContent } from './smart-account-update-content';

const renderComponent = () =>
  renderWithProvider(<SmartAccountUpdateContent />, {
    state: {
      engine: { backgroundState },
    },
  });

describe('SmartContractWithLogo', () => {
  it('renders correctly', () => {
    const { getByText } = renderComponent();
    expect(getByText('Use smart account?')).toBeTruthy();
    expect(getByText('Faster transactions, lower fees')).toBeTruthy();
    expect(getByText('Pay with any token, any time')).toBeTruthy();
    expect(getByText('Same account, smarter features.')).toBeTruthy();
  });
});
