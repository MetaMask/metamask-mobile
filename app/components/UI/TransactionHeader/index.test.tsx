import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import TransactionHeader from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import { mockNetworkState } from '../../../util/test/network';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import TransactionTypes from '../../../core/TransactionTypes';
import { TransactionReviewSelectorsIDs } from './TransactionReview.testIds';

const MOCK_ADDRESS_1 = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
const MOCK_ADDRESS_2 = '0xd018538C87232FF95acbCe4870629b75640a78E7';

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountTrackerController: {
        accountsByChainId: {
          '0x1': {
            [MOCK_ADDRESS_1]: {
              balance: '200',
            },
            [MOCK_ADDRESS_2]: {
              balance: '200',
            },
          },
        },
      },
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
  currentPageInformation: {
    origin: 'http://metamask.github.io',
    url: 'http://metamask.github.io',
    icon: 'http://metamask.github.io/favicon.ico',
    currentEnsName: '',
    spenderAddress: MOCK_ADDRESS_1,
  },
  networkType: 'sepolia',
  nickname: 'Sepolia',
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
}));

describe('TransactionHeader', () => {
  it('render correctly', () => {
    const wrapper = renderWithProvider(
      <TransactionHeader {...defaultProps} />,
      { state: mockInitialState },
      true,
      false,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it.each([
    ['ORIGIN_METAMASK', ORIGIN_METAMASK],
    ['MM_FOX_CODE', process.env.MM_FOX_CODE],
    ['MMM', TransactionTypes.MMM],
  ])('does not render origin if %s', (_, origin) => {
    const { queryByTestId } = renderWithProvider(
      <TransactionHeader
        {...defaultProps}
        currentPageInformation={{
          ...defaultProps.currentPageInformation,
          origin,
        }}
      />,
      { state: mockInitialState },
      true,
      false,
    );

    expect(
      queryByTestId(TransactionReviewSelectorsIDs.TRANSACTION_HEADER_ORIGIN),
    ).toBeNull();
  });
});
