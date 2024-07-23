import { waitFor } from '@testing-library/react-native';
import { AggregatorNetwork } from '@consensys/on-ramp-sdk/dist/API';
import useFetchRampNetworks from './useFetchRampNetworks';
import { SDK } from '../sdk';
import { updateOnRampNetworks } from '../../../../reducers/fiatOrders';
import initialRootState from '../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';

jest.mock('../sdk', () => ({
  SDK: {
    getNetworks: jest.fn(),
  },
}));

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

describe('useFetchRampNetworks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls useFetchRampNetworks and update with received value', async () => {
    const mockResponse: AggregatorNetwork[] = [
      {
        active: true,
        chainId: '1',
        chainName: 'Ethereum Mainnet',
        shortName: 'Ethereum',
        nativeTokenSupported: true,
      },
      {
        active: true,
        chainId: '137',
        chainName: 'Polygon Mainnet',
        shortName: 'Polygon',
        nativeTokenSupported: true,
      },
    ];
    (SDK.getNetworks as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHookWithProvider(() => useFetchRampNetworks(), {
      state: {
        ...initialRootState,
      },
    });

    await waitFor(() => expect(result.current[0]).toBe(false));

    expect(SDK.getNetworks).toHaveBeenCalled();
    expect(result.current[0]).toEqual(false);
    expect(result.current[1]).toBeUndefined();
    expect(result.current[2]).toBeInstanceOf(Function);
    expect(mockDispatch).toHaveBeenCalledWith(
      updateOnRampNetworks(mockResponse),
    );
  });

  it('calls useFetchRampNetworks and update with default value', async () => {
    const mockResponse = undefined;
    (SDK.getNetworks as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHookWithProvider(() => useFetchRampNetworks(), {
      state: {
        ...initialRootState,
      },
    });

    await waitFor(() => expect(result.current[0]).toBe(false));

    expect(SDK.getNetworks).toHaveBeenCalled();
    expect(result.current[0]).toEqual(false);
    expect(result.current[1]).toBeUndefined();
    expect(result.current[2]).toBeInstanceOf(Function);
    expect(mockDispatch).toHaveBeenCalledWith(updateOnRampNetworks([]));
  });

  it('returns error state if SDK.getNetworks fails', async () => {
    const error = new Error('test error');
    (SDK.getNetworks as jest.Mock).mockRejectedValue(error);

    const { result } = renderHookWithProvider(() => useFetchRampNetworks(), {
      state: {
        ...initialRootState,
      },
    });

    await waitFor(() => expect(result.current[0]).toBe(false));

    expect(SDK.getNetworks).toHaveBeenCalled();
    expect(result.current[0]).toEqual(false);
    expect(result.current[1]).toEqual(error);
    expect(result.current[2]).toBeInstanceOf(Function);
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
