import React from 'react';
import AccountApproval from '.';
import { backgroundState } from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');
  return {
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
              accounts: ['0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756'],
            },
          ],
        },
      },
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
    },
  };
});

jest.mock('../../../util/phishingDetection', () => ({
  getPhishingTestResult: jest.fn((url) => {
    if (url === 'phishing.com') return { result: true };
    return { result: false };
  }),
  isProductSafetyDappScanningEnabled: jest.fn().mockReturnValue(false),
}));

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
        accounts: {
          '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756': {
            balance: '0x0',
            name: 'Account 1',
            address: '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
          },
        },
      },
      TokensController: {
        allTokens: {
          '0x1': {
            '0xc4966c0d659d99699bfd7eb54d8fafee40e4a756': [],
          },
        },
      },
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
