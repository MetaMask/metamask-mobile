import React from 'react';
import AccountApproval from '.';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

jest.mock('../../../core/Engine', () => ({
  context: {
    PhishingController: {
      maybeUpdateState: jest.fn(),
      test: jest.fn((url: string) => {
        if (url === 'phishing.com') return { result: true };
        return { result: false };
      }),
    },
    KeyringController: {
      getAccountKeyringType: () => Promise.resolve('HD Key Tree'),
      state: {
        keyrings: [
          {
            accounts: ['0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'],
          },
        ],
      },
    },
  },
}));

const mockInitialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

describe('AccountApproval', () => {
  it('should render correctly', () => {
    const container = renderWithProvider(
      <AccountApproval
        currentPageInformation={{ icon: '', url: '', title: '' }}
      />,
      { state: mockInitialState },
    );

    expect(container).toMatchSnapshot();
  });

  it('should render a warning banner if the hostname is included in phishing list', () => {
    const { getByText } = renderWithProvider(
      <AccountApproval
        currentPageInformation={{ icon: '', url: 'phishing.com', title: '' }}
      />,
      { state: mockInitialState },
    );

    expect(getByText('Deceptive site ahead')).toBeTruthy();
  });
});
