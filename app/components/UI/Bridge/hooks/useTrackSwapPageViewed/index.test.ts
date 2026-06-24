import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  selectDestToken,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useTrackSwapPageViewed } from './index';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics');

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();

const sourceToken = {
  symbol: 'ETH',
  chainId: '0x1',
  address: '0x0000000000000000000000000000000000000000',
};

const destToken = {
  symbol: 'USDC',
  chainId: '0x89',
  address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
};

describe('useTrackSwapPageViewed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({ type: 'built' })),
    }));
    jest.mocked(useAnalytics).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as unknown as ReturnType<typeof useAnalytics>);
  });

  it('does not track when the source token is missing', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSourceToken) {
        return null;
      }
      if (selector === selectDestToken) {
        return destToken;
      }
      return undefined;
    });

    renderHook(() => useTrackSwapPageViewed());

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(mockCreateEventBuilder).not.toHaveBeenCalled();
  });

  it('tracks SWAP_PAGE_VIEWED and Asset Viewed with swap page properties when the source token is set', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSourceToken) {
        return sourceToken;
      }
      if (selector === selectDestToken) {
        return destToken;
      }
      return undefined;
    });

    renderHook(() => useTrackSwapPageViewed());

    const expectedPageProperties = {
      chain_id_source: '1',
      chain_id_destination: '137',
      token_symbol_source: 'ETH',
      token_symbol_destination: 'USDC',
      token_address_source: sourceToken.address,
      token_address_destination: destToken.address,
    };

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockCreateEventBuilder.mock.calls[0][0]).toBe(
      MetaMetricsEvents.SWAP_PAGE_VIEWED,
    );
    expect(mockCreateEventBuilder.mock.calls[1][0]).toBe(
      MetaMetricsEvents.ASSET_VIEWED,
    );

    const swapBuilder = mockCreateEventBuilder.mock.results[0].value;
    const assetViewedBuilder = mockCreateEventBuilder.mock.results[1].value;

    expect(swapBuilder.addProperties).toHaveBeenCalledWith(
      expectedPageProperties,
    );
    expect(assetViewedBuilder.addProperties).toHaveBeenCalledWith({
      ...expectedPageProperties,
      trade_type: 'Swaps',
      implementation_type: 'native',
    });
  });

  it('tracks at most once per hook mount when the source token stays set', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSourceToken) {
        return sourceToken;
      }
      if (selector === selectDestToken) {
        return destToken;
      }
      return undefined;
    });

    const { rerender } = renderHook(() => useTrackSwapPageViewed());

    rerender(undefined);

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });
});
