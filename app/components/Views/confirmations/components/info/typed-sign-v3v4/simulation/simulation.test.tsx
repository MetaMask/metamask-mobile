import React from 'react';
import cloneDeep from 'lodash/cloneDeep';
import {
  DecodingData,
  DecodingDataChangeType,
  DecodingDataStateChanges,
  SignatureRequest,
} from '@metamask/signature-controller';
import { useGetTokenStandardAndDetails } from '../../../../hooks/useGetTokenStandardAndDetails';
import { typedSignV4ConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { memoizedGetTokenStandardAndDetails } from '../../../../utils/token';
import TypedSignV3V4Simulation from './simulation';

jest.mock('../../../../hooks/useGetTokenStandardAndDetails');

jest.mock('../../../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: () => 'mainnet',
    },
  },
}));

const stateChangesApprove = [
  {
    assetType: 'ERC20',
    changeType: DecodingDataChangeType.Approve,
    address: '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
    amount: '12345',
    contractAddress: '0x514910771af9ca656af840dff83e8264ecf986ca',
  },
];

const mockState = (
  mockStateChanges: DecodingDataStateChanges,
  {
    mockDecodingDataProps,
    stubDecodingLoading = false,
  }: {
    mockDecodingDataProps?: Partial<DecodingData>;
    stubDecodingLoading?: boolean;
  } = {
    mockDecodingDataProps: {},
    stubDecodingLoading: false,
  },
) => {
  const clonedMockState = cloneDeep(typedSignV4ConfirmationState);
  const request = clonedMockState.engine.backgroundState.SignatureController
    .signatureRequests[
    'fb2029e1-b0ab-11ef-9227-05a11087c334'
  ] as SignatureRequest;

  request.decodingLoading = stubDecodingLoading;
  request.decodingData = {
    ...mockDecodingDataProps,
    stateChanges: mockStateChanges,
  };

  return clonedMockState;
};

describe('PermitSimulation', () => {
  afterEach(() => {
    jest.clearAllMocks();

    /** Reset memoized function using getTokenStandardAndDetails for each test */
    memoizedGetTokenStandardAndDetails?.cache?.clear?.();
  });

  it('renders DecodedSimulation loader if decodingLoading is true', async () => {
    const { queryByTestId } = renderWithProvider(<TypedSignV3V4Simulation />, {
      state: mockState(stateChangesApprove, {
        stubDecodingLoading: true,
      }),
    });

    expect(await queryByTestId('confirm-v3v4-simulation-loader')).toBeDefined();
  });

  it('renders DecodingSimulation with "Unavailable" if decoding data is empty', async () => {
    const { getByText } = renderWithProvider(<TypedSignV3V4Simulation />, {
      state: mockState([]),
    });

    expect(await getByText('Estimated changes')).toBeDefined();
    expect(await getByText('Unavailable')).toBeDefined();
  });

  it('renders DecodingSimulation for permits', async () => {
    (
      useGetTokenStandardAndDetails as jest.MockedFn<
        typeof useGetTokenStandardAndDetails
      >
    ).mockReturnValue({
      details: {
        symbol: 'TST',
        decimals: '4',
        balance: undefined,
        standard: 'ERC20',
        decimalsNumber: 4,
      },
      isPending: false,
    });

    const { getByText } = renderWithProvider(<TypedSignV3V4Simulation />, {
      state: mockState(stateChangesApprove),
    });

    expect(await getByText('Estimated changes')).toBeDefined();
    expect(await getByText('Spending cap')).toBeDefined();
    expect(await getByText('1.235')).toBeDefined();
  });

  it('renders PermitSimulation if decoding api returns error', async () => {
    (
      useGetTokenStandardAndDetails as jest.MockedFn<
        typeof useGetTokenStandardAndDetails
      >
    ).mockReturnValue({
      details: {
        symbol: 'TST',
        decimals: '2',
        balance: undefined,
        standard: 'ERC20',
        decimalsNumber: 4,
      },
      isPending: false,
    });

    const { getByText } = renderWithProvider(<TypedSignV3V4Simulation />, {
      state: mockState([], {
        mockDecodingDataProps: {
          error: { message: 'some error', type: 'SOME_ERROR' },
        } as Partial<DecodingData>,
      }),
    });

    expect(await getByText('Estimated changes')).toBeDefined();
    expect(await getByText('Spending cap')).toBeDefined();
    expect(await getByText('0.3')).toBeDefined();
    expect(
      await getByText(
        "You're giving the spender permission to spend this many tokens from your account.",
      ),
    ).toBeDefined();
  });
});
