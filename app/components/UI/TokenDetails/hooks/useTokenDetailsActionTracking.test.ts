import { renderHook } from '@testing-library/react-hooks';
import { useTokenDetailsActionTracking } from './useTokenDetailsActionTracking';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  TokenDetailsAction,
  TokenDetailsSource,
} from '../constants/constants';

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({ category: 'test' });
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const defaultToken = {
  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  chainId: '0x1',
  symbol: 'DAI',
  name: 'Dai Stablecoin',
  decimals: 18,
  balance: '100',
  balanceFiat: '$100',
  logo: '',
  image: '',
  isETH: false,
  hasBalanceError: false,
  aggregators: [],
  source: TokenDetailsSource.MobileTokenList,
};

describe('useTokenDetailsActionTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks send action with correct properties', () => {
    const { result } = renderHook(() =>
      useTokenDetailsActionTracking({
        token: defaultToken,
        hasBalance: true,
        severity: 'Verified',
      }),
    );

    result.current(TokenDetailsAction.Send);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.TOKEN_DETAILS_ACTION_TAPPED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      action: 'send',
      token_symbol: 'DAI',
      token_address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      chain_id: '0x1',
      has_balance: true,
      severity: 'Verified',
      source: 'mobile-token-list',
    });
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('tracks receive action', () => {
    const { result } = renderHook(() =>
      useTokenDetailsActionTracking({
        token: defaultToken,
        hasBalance: false,
        severity: undefined,
      }),
    );

    result.current(TokenDetailsAction.Receive);

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'receive',
        has_balance: false,
        severity: undefined,
      }),
    );
  });

  it('tracks more_opened action', () => {
    const { result } = renderHook(() =>
      useTokenDetailsActionTracking({
        token: defaultToken,
        hasBalance: true,
        severity: 'Warning',
      }),
    );

    result.current(TokenDetailsAction.MoreOpened);

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'more_opened',
        severity: 'Warning',
      }),
    );
  });

  it('tracks remove_token action', () => {
    const { result } = renderHook(() =>
      useTokenDetailsActionTracking({
        token: defaultToken,
        hasBalance: true,
        severity: 'Spam',
      }),
    );

    result.current(TokenDetailsAction.RemoveToken);

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'remove_token',
        severity: 'Spam',
      }),
    );
  });

  it('tracks view_on_explorer action', () => {
    const { result } = renderHook(() =>
      useTokenDetailsActionTracking({
        token: defaultToken,
        hasBalance: false,
        severity: 'Benign',
      }),
    );

    result.current(TokenDetailsAction.ViewOnExplorer);

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'view_on_explorer',
        severity: 'Benign',
      }),
    );
  });

  it('tracks copy_token_address action', () => {
    const { result } = renderHook(() =>
      useTokenDetailsActionTracking({
        token: defaultToken,
        hasBalance: true,
        severity: 'Verified',
      }),
    );

    result.current(TokenDetailsAction.CopyTokenAddress);

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'copy_token_address',
      }),
    );
  });

  it('defaults source to Unknown when token has no source', () => {
    const tokenWithoutSource = { ...defaultToken, source: undefined };
    const { result } = renderHook(() =>
      useTokenDetailsActionTracking({
        token: tokenWithoutSource,
        hasBalance: false,
        severity: undefined,
      }),
    );

    result.current(TokenDetailsAction.Send);

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'unknown',
      }),
    );
  });
});
