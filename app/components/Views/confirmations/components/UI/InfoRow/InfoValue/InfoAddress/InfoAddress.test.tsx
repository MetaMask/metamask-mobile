import React from 'react';

import renderWithProvider from '../../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_1,
} from '../../../../../../../../util/test/accountsControllerTestUtils';

import InfoAddress from './InfoAddress';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
      },
    },
  },
};

describe('InfoAddress', () => {
  it('should display account name if present', async () => {
    const { getByText } = renderWithProvider(
      <InfoAddress address={MOCK_ADDRESS_1} />,
      { state: mockInitialState },
    );
    expect(getByText('Account 1')).toBeDefined();
  });

  it('should display shortened address if name is not present', async () => {
    const { getByText } = renderWithProvider(
      <InfoAddress address="0xE786Abcd8E87067465aDd0007BAa00bED2282A7F" />,
      { state: mockInitialState },
    );
    expect(getByText('0xE786...2A7F')).toBeDefined();
  });
});
