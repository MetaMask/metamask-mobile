import { renderHook } from '@testing-library/react-hooks';
import { useOriginSource } from './useOriginSource';
import { SourceType } from './useMetrics/useMetrics.types';
import AppConstants from '../../core/AppConstants';
import { RootState } from '../../reducers';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector: (state: RootState) => unknown) =>
    selector({
      sdk: {
        wc2Metadata: {
          id: '',
        },
      },
    } as RootState),
  ),
}));

jest.mock('../../core/SDKConnect/SDKConnect', () => ({
  getInstance: jest.fn(() => ({
    getConnection: jest.fn(({ channelId }) => {
      if (channelId === '123e4567-e89b-12d3-a456-426614174000') {
        return {
          id: channelId,
          trigger: 'test-trigger',
          otherPublicKey: 'test-public-key',
          origin: 'test-origin',
          protocolVersion: '1.0',
          originatorInfo: { name: 'test-originator' },
          initialConnection: true,
          validUntil: Date.now() + 10000,
        };
      }
      return undefined;
    }),
  })),
}));

describe('useOriginSource', () => {
  const mockState = {
    sdk: {
      wc2Metadata: {
        id: '',
      },
    },
  } as RootState;

  const mockSelector = jest.requireMock('react-redux').useSelector;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelector.mockImplementation((selector: (state: RootState) => unknown) =>
      selector(mockState),
    );
  });

  it('should return undefined when origin is undefined', () => {
    const { result } = renderHook(() => useOriginSource({ origin: undefined }));
    expect(result.current).toBeUndefined();
  });

  it('should return SDK source for valid UUID origin with connection', () => {
    const { result } = renderHook(() =>
      useOriginSource({ origin: '123e4567-e89b-12d3-a456-426614174000' }),
    );
    expect(result.current).toBe(SourceType.SDK);
  });

  it('should return SDK source for SDK_REMOTE_ORIGIN', () => {
    const { result } = renderHook(() =>
      useOriginSource({
        origin: `${AppConstants.MM_SDK.SDK_REMOTE_ORIGIN}some-path`,
      }),
    );
    expect(result.current).toBe(SourceType.SDK);
  });

  it('should return WALLET_CONNECT source when WC metadata is present', () => {
    // Mock WalletConnect metadata
    const wcState = {
      ...mockState,
      sdk: {
        wc2Metadata: {
          id: 'some-wc-id',
        },
      },
    } as RootState;

    jest
      .requireMock('react-redux')
      .useSelector.mockImplementation(
        (selector: (state: RootState) => unknown) => selector(wcState),
      );

    const { result } = renderHook(() =>
      useOriginSource({ origin: 'some-non-uuid-origin' }),
    );
    expect(result.current).toBe(SourceType.WALLET_CONNECT);
  });

  it('should return IN_APP_BROWSER source as default', () => {
    mockSelector.mockImplementation((selector: (state: RootState) => unknown) =>
      selector(mockState),
    );

    const { result } = renderHook(() =>
      useOriginSource({ origin: 'https://example.com' }),
    );
    expect(result.current).toBe(SourceType.IN_APP_BROWSER);
  });
});
