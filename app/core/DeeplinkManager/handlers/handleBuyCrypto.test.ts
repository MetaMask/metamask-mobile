import { isNetworkBuySupported } from '../../../components/UI/Ramp/utils';
import Routes from '../../../constants/navigation/Routes';
import DeeplinkManager from '../DeeplinkManager';
import handleBuyCrypto from './handleBuyCrypto';
import { chainIdSelector, getRampNetworks } from '../../../reducers/fiatOrders';
import { RootState } from '../../../reducers';

jest.mock('../../../components/UI/Ramp/utils', () => ({
  isNetworkBuySupported: jest.fn(),
}));
jest.mock('../../../reducers/fiatOrders', () => ({
  chainIdSelector: jest.fn(),
  getRampNetworks: jest.fn(),
}));

describe('handleBuyCrypto', () => {
  let mockDispatch = jest.fn();
  let mockNavigate = jest.fn();

  const mockChainIdSelector = chainIdSelector as jest.Mock;
  const mockGetRampNetworks = getRampNetworks as jest.Mock;
  const mockIsNetworkBuySupported = isNetworkBuySupported as jest.Mock;

  let deeplinkManager: DeeplinkManager;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDispatch = jest.fn((fn) =>
      fn(
        () => {
          // do nothing
        },
        () => {
          // do nothing
        },
      ),
    );
    mockNavigate = jest.fn();

    deeplinkManager = {
      dispatch: mockDispatch,
      navigation: {
        navigate: mockNavigate,
      },
    } as unknown as DeeplinkManager;
  });

  it('should navigates to the fiat on ramp aggregator when the network is supported', () => {
    mockIsNetworkBuySupported.mockReturnValue(true);

    handleBuyCrypto({ deeplinkManager });

    expect(mockDispatch).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.FIAT_ON_RAMP_AGGREGATOR.ID,
    );
  });

  it('should NOT navigate when the network is not supported', () => {
    mockIsNetworkBuySupported.mockReturnValue(false);

    handleBuyCrypto({ deeplinkManager });

    expect(mockDispatch).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should call isNetworkBuySupported with correct parameters', () => {
    const mockState = {} as unknown as RootState;

    mockIsNetworkBuySupported.mockReturnValue(true);

    mockDispatch = jest.fn((fn) =>
      fn(
        () => {
          // do nothing
        },
        () => mockState,
      ),
    );

    handleBuyCrypto({ deeplinkManager });

    expect(mockIsNetworkBuySupported).toHaveBeenCalledWith(
      mockChainIdSelector(mockState),
      mockGetRampNetworks(mockState),
    );
  });

  it.each([
    [{}, true],
    [{}, false],
  ])(
    'should navigates correctly based on network support (state: %p)',
    (mockState, shouldNavigate) => {
      mockIsNetworkBuySupported.mockReturnValue(shouldNavigate);
      mockDispatch = jest.fn((fn) =>
        fn(
          () => {
            // do nothing
          },
          () => mockState,
        ),
      );

      handleBuyCrypto({ deeplinkManager });

      if (shouldNavigate) {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.FIAT_ON_RAMP_AGGREGATOR.ID,
        );
      } else {
        expect(mockNavigate).not.toHaveBeenCalled();
      }
    },
  );
});
