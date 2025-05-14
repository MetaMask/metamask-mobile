import React from 'react';

import renderWithProvider, {
  DeepPartial,
} from '../../../../../../util/test/renderWithProvider';
import ApproveTransactionHeader from '.';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { APPROVAL_TAG_URL_ORIGIN_PILL } from '../../../../../UI/ApprovalTagUrl';
import { createMockAccountsControllerState } from '../../../../../../util/test/accountsControllerTestUtils';
import { RootState } from '../../../../../../reducers';
import { mockNetworkState } from '../../../../../../util/test/network';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import TransactionTypes from '../../../../../../core/TransactionTypes';

const MOCK_ADDRESS_1 = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
const MOCK_ADDRESS_2 = '0xd018538C87232FF95acbCe4870629b75640a78E7';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
]);

jest.mock('../../../../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual(
      '../../../../../../util/test/accountsControllerTestUtils',
    );
  return {
    context: {
      TokensController: {
        addToken: () => undefined,
      },
      KeyringController: {
        state: {
          keyrings: [],
        },
      },
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
    },
  };
});

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountTrackerController: {
        accountsByChainId: {
          [CHAIN_IDS.SEPOLIA]: {
            [MOCK_ADDRESS_1]: {
              balance: '200',
            },
            [MOCK_ADDRESS_2]: {
              balance: '200',
            },
          },
        },
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      NetworkController: {
        ...mockNetworkState({
          chainId: CHAIN_IDS.SEPOLIA,
          id: 'sepolia',
          nickname: 'Sepolia',
          ticker: 'ETH',
        }),
      },
    },
  },
};

const defaultProps = {
  from: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
  url: 'http://metamask.github.io',
  asset: {
    address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
    symbol: 'RAN',
    decimals: 18,
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
    expect(getByText('https://metamask.github.io')).toBeDefined();
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
    expect(getByText('https://metamask.github.io')).toBeDefined();
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

    const originPill = queryByTestId(APPROVAL_TAG_URL_ORIGIN_PILL);
    expect(originPill).toBeNull();
  });

  it.each([
    ['ORIGIN_METAMASK', ORIGIN_METAMASK],
    ['MM_FOX_CODE', process.env.MM_FOX_CODE],
    ['MMM', TransactionTypes.MMM],
  ])('does not render origin if %s', (_, origin) => {
    const { queryByTestId } = renderWithProvider(
      <ApproveTransactionHeader {...defaultProps} origin={origin} />,
      { state: mockInitialState },
    );

    expect(queryByTestId(APPROVAL_TAG_URL_ORIGIN_PILL)).toBeNull();
  });
});
