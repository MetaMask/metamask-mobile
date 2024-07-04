import React from 'react';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ApproveTransactionHeader from '.';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { APPROVE_TRANSACTION_ORIGIN_PILL } from './ApproveTransactionHeader.constants';
import { createMockAccountsControllerState } from '../../../../../util/test/accountsControllerTestUtils';

const MOCK_ADDRESS_1 = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
const MOCK_ADDRESS_2 = '0xd018538C87232FF95acbCe4870629b75640a78E7';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
]);

jest.mock('../../../../../core/Engine', () => ({
  context: {
    TokensController: {
      addToken: () => undefined,
    },
    KeyringController: {
      state: {
        keyrings: [],
      },
    },
  },
}));

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountTrackerController: {
        accounts: {
          [MOCK_ADDRESS_1]: {
            balance: '200',
          },
          [MOCK_ADDRESS_2]: {
            balance: '200',
          },
        },
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      NetworkController: {
        providerConfig: {
          chainId: '0xaa36a7',
          type: 'sepolia',
          nickname: 'Sepolia',
        },
      },
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
}));

describe('ApproveTransactionHeader', () => {
  it('should render correctly', () => {
    const wrapper = renderWithProvider(
      <ApproveTransactionHeader
        from="0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272"
        origin="http://metamask.github.io"
        url="http://metamask.github.io"
        asset={{
          address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
          symbol: 'ERC',
          decimals: 4,
        }}
      />,
      { state: mockInitialState },
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render with domain title', () => {
    const { getByText } = renderWithProvider(
      <ApproveTransactionHeader
        from="0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272"
        origin="http://metamask.github.io"
        url="http://metamask.github.io"
        asset={{
          address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
          symbol: 'ERC',
          decimals: 4,
        }}
      />,
      { state: mockInitialState },
    );
    expect(getByText('http://metamask.github.io')).toBeDefined();
  });

  it('should get origin when present', () => {
    const { getByText } = renderWithProvider(
      <ApproveTransactionHeader
        from="0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272"
        origin="http://metamask.github.io"
        url="http://metamask.github.io"
        asset={{
          address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
          symbol: 'RAN',
          decimals: 18,
        }}
      />,
      { state: mockInitialState },
    );
    expect(getByText('http://metamask.github.io')).toBeDefined();
  });

  it('should return origin to be null when not present', () => {
    const container = renderWithProvider(
      <ApproveTransactionHeader
        from="0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272"
        origin={undefined}
        url="http://metamask.github.io"
        asset={{
          address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
          symbol: 'RAN',
          decimals: 18,
        }}
      />,
      { state: mockInitialState },
    );
    expect(container).toMatchSnapshot();
  });

  it('should not show an origin pill if origin is deeplink', () => {
    const { queryByTestId } = renderWithProvider(
      <ApproveTransactionHeader
        from="0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272"
        origin="qr-code"
        url="http://metamask.github.io"
        asset={{
          address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
          symbol: 'RAN',
          decimals: 18,
        }}
      />,
      { state: mockInitialState },
    );

    const originPill = queryByTestId(APPROVE_TRANSACTION_ORIGIN_PILL);
    expect(originPill).toBeNull();
  });
});
