import React from 'react';
import { act } from '@testing-library/react-native';
import SimulationValueDisplay from './value-display';

import { memoizedGetTokenStandardAndDetails } from '../../../../../../utils/token';
import { useGetTokenStandardAndDetails } from '../../../../../../hooks/useGetTokenStandardAndDetails';
import { TokenStandard } from '../../../../../../../../UI/SimulationDetails/types';
import { getTokenDetails } from '../../../../../../../../../util/address';
import { backgroundState } from '../../../../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../../../../util/test/renderWithProvider';
import { useMetrics } from '../../../../../../../../hooks/useMetrics';
import { MetricsEventBuilder } from '../../../../../../../../../core/Analytics/MetricsEventBuilder';

const mockInitialState = {
  engine: {
    backgroundState,
  },
};

const mockErc20TokenDetails = {
  details: {
    symbol: 'TST',
    decimals: '4',
    balance: undefined,
    standard: TokenStandard.ERC20,
    decimalsNumber: 4,
  },
  isPending: false,
};

const mockTrackEvent = jest.fn();

jest.mock('../../../../../../../../hooks/useMetrics');
jest.mock('../../../../../../hooks/useGetTokenStandardAndDetails');

jest.mock('../../../../../../../../../util/address', () => ({
  getTokenDetails: jest.fn(),
  renderShortAddress: jest.requireActual(
    '../../../../../../../../../util/address',
  ).renderShortAddress,
}));

describe('SimulationValueDisplay', () => {
  beforeEach(() => {
    (useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
      enable: jest.fn(),
      addTraitsToUser: jest.fn(),
      createDataDeletionTask: jest.fn(),
      checkDataDeleteStatus: jest.fn(),
      getDeleteRegulationCreationDate: jest.fn(),
      getDeleteRegulationId: jest.fn(),
      isDataRecorded: jest.fn(),
      isEnabled: jest.fn(),
      getMetaMetricsId: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();

    /** Reset memoized function using getTokenStandardAndDetails for each test */
    memoizedGetTokenStandardAndDetails?.cache?.clear?.();
  });

  it('renders component correctly', async () => {
    (
      useGetTokenStandardAndDetails as jest.MockedFn<
        typeof useGetTokenStandardAndDetails
      >
    ).mockReturnValue(mockErc20TokenDetails);

    const { findByText } = renderWithProvider(
      <SimulationValueDisplay
        modalHeaderText={'Spending Cap'}
        tokenContract={'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'}
        value={'4321'}
        chainId={'0x1'}
      />,
      { state: mockInitialState },
    );

    expect(await findByText('0.432')).toBeDefined();
  });

  it('renders loading state when fetching token details', async () => {
    (
      useGetTokenStandardAndDetails as jest.MockedFn<
        typeof useGetTokenStandardAndDetails
      >
    ).mockReturnValue({
      details: {
        decimalsNumber: undefined,
        standard: undefined,
        symbol: undefined,
      },
      isPending: true,
    });

    const { findByTestId } = renderWithProvider(
      <SimulationValueDisplay
        modalHeaderText={'Spending Cap'}
        tokenContract={'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'}
        value={'4321'}
        chainId={'0x1'}
      />,
      { state: mockInitialState },
    );

    expect(await findByTestId('simulation-value-display-loader')).toBeDefined();
  });

  it('renders null when tokenContract is not found', async () => {
    const { queryByTestId } = renderWithProvider(
      <SimulationValueDisplay
        modalHeaderText={'Spending Cap'}
        tokenContract={undefined}
        value={'4321'}
        chainId={'0x1'}
      />,
      { state: mockInitialState },
    );

    expect(queryByTestId('simulation-value-display-loader')).toBeNull();
  });

  it('renders no value display if no value was loaded', () => {
    (
      useGetTokenStandardAndDetails as jest.MockedFn<
        typeof useGetTokenStandardAndDetails
      >
    ).mockReturnValue({
      details: {
        decimalsNumber: undefined,
        standard: undefined,
        symbol: undefined,
      },
      isPending: false,
    });

    const { queryByTestId } = renderWithProvider(
      <SimulationValueDisplay
        modalHeaderText={'Spending Cap'}
        tokenContract={'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'}
        value={''}
        chainId={'0x1'}
      />,
      { state: mockInitialState },
    );
    expect(queryByTestId('simulation-value-display-loader')).toBeNull();
  });

  it('renders "Unlimited" for large values when canDisplayValueAsUnlimited is true', async () => {
    (
      useGetTokenStandardAndDetails as jest.MockedFn<
        typeof useGetTokenStandardAndDetails
      >
    ).mockReturnValue(mockErc20TokenDetails);

    const { findByText } = renderWithProvider(
      <SimulationValueDisplay
        canDisplayValueAsUnlimited
        modalHeaderText={'Spending Cap'}
        tokenContract={'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'}
        value={'1461501637330902918203684832716283019655932542975'}
        chainId={'0x1'}
      />,
      { state: mockInitialState },
    );

    expect(await findByText('Unlimited')).toBeDefined();
  });

  it('renders Dai Revoke', async () => {
    (
      useGetTokenStandardAndDetails as jest.MockedFn<
        typeof useGetTokenStandardAndDetails
      >
    ).mockReturnValue(mockErc20TokenDetails);

    const { findByText } = renderWithProvider(
      <SimulationValueDisplay
        canDisplayValueAsUnlimited
        modalHeaderText={'Revoke'}
        tokenContract={'0x6b175474e89094c44da98b954eedeac495271d0f'}
        value={'12345'}
        chainId={'0x1'}
        allowed={false}
      />,
      { state: mockInitialState },
    );

    expect(await findByText('0x6B175...71d0F')).toBeDefined();
  });

  it('renders Dai Revoke when value is 0', async () => {
    (
      useGetTokenStandardAndDetails as jest.MockedFn<
        typeof useGetTokenStandardAndDetails
      >
    ).mockReturnValue(mockErc20TokenDetails);

    const { findByText } = renderWithProvider(
      <SimulationValueDisplay
        canDisplayValueAsUnlimited
        modalHeaderText={'Revoke'}
        tokenContract={'0x6b175474e89094c44da98b954eedeac495271d0f'}
        value={'0'}
        chainId={'0x1'}
      />,
      { state: mockInitialState },
    );

    expect(await findByText('0x6B175...71d0F')).toBeDefined();
  });

  it('renders Dai Approve', async () => {
    (
      useGetTokenStandardAndDetails as jest.MockedFn<
        typeof useGetTokenStandardAndDetails
      >
    ).mockReturnValue(mockErc20TokenDetails);

    const { findByText } = renderWithProvider(
      <SimulationValueDisplay
        canDisplayValueAsUnlimited
        modalHeaderText={'Spending cap'}
        tokenContract={'0x6b175474e89094c44da98b954eedeac495271d0f'}
        value={undefined}
        chainId={'0x1'}
        allowed
      />,
      { state: mockInitialState },
    );

    expect(await findByText('0x6B175...71d0F')).toBeDefined();
    expect(await findByText('Unlimited')).toBeDefined();
  });

  it('invokes method to track missing decimal information for ERC20 tokens only once', async () => {
    (
      useGetTokenStandardAndDetails as jest.MockedFn<
        typeof useGetTokenStandardAndDetails
      >
    ).mockReturnValue({
      details: {
        symbol: 'TST',
        decimals: undefined,
        balance: undefined,
        standard: TokenStandard.ERC20,
        decimalsNumber: 4,
      },
      isPending: false,
    });

    renderWithProvider(
      <SimulationValueDisplay
        modalHeaderText={'Spending Cap'}
        tokenContract={'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'}
        value={'4321'}
        chainId={'0x1'}
      />,
      { state: mockInitialState },
    );

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('does not invoke method to track missing decimal information for ERC20 tokens', async () => {
    (
      useGetTokenStandardAndDetails as jest.MockedFn<
        typeof useGetTokenStandardAndDetails
      >
    ).mockReturnValue(mockErc20TokenDetails);

    renderWithProvider(
      <SimulationValueDisplay
        modalHeaderText={'Spending Cap'}
        tokenContract={'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'}
        value={'4321'}
        chainId={'0x1'}
      />,
      { state: mockInitialState },
    );

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  describe('when token is an ERC721 token', () => {
    beforeEach(() => {
      jest.mocked(getTokenDetails).mockResolvedValue({
        name: 'TST',
        symbol: 'TST',
        standard: TokenStandard.ERC721,
      });
    });

    it('does not invoke method to track missing decimal information', async () => {
      renderWithProvider(
        <SimulationValueDisplay
          modalHeaderText={'Withdraw'}
          tokenContract={'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'}
          tokenId={'1234'}
          value={'4321'}
          chainId={'0x1'}
        />,
        { state: mockInitialState },
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });
});
