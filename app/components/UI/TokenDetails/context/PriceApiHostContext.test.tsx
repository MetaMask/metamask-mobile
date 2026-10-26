import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { PRICE_API_BASE_URL } from '../../../../constants/urls';
import { selectMemecoinTdpV1PriceApiBaseUrl } from '../../../../selectors/featureFlagController/assetsMemecoinTdpV1';
import { usePriceApiHost } from './PriceApiHostContext';
import { PriceApiHostProvider } from './PriceApiHostProvider';

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector: unknown) => (selector as () => string)()),
}));

jest.mock(
  '../../../../selectors/featureFlagController/assetsMemecoinTdpV1',
  () => ({
    selectMemecoinTdpV1PriceApiBaseUrl: jest.fn(),
  }),
);

const mockSelectHost = jest.mocked(selectMemecoinTdpV1PriceApiBaseUrl);

const DEV_HOST = 'https://price.dev-api.cx.metamask.io';

const withProvider = ({ children }: { children: React.ReactNode }) => (
  <PriceApiHostProvider>{children}</PriceApiHostProvider>
);

describe('usePriceApiHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectHost.mockReturnValue(DEV_HOST);
  });

  // The whole containment model rests on this: every caller that is not
  // deliberately wrapped keeps the host it already used, without being edited
  // and without knowing the provider exists.
  it('returns prod outside a provider', () => {
    const { result } = renderHook(() => usePriceApiHost());

    expect(result.current).toBe(PRICE_API_BASE_URL);
  });

  it('does not read the flag outside a provider', () => {
    renderHook(() => usePriceApiHost());

    expect(mockSelectHost).not.toHaveBeenCalled();
  });

  it('returns the configured host inside a provider', () => {
    const { result } = renderHook(() => usePriceApiHost(), {
      wrapper: withProvider,
    });

    expect(result.current).toBe(DEV_HOST);
  });

  // The selector falls back to prod on its own, so a wrapped subtree with no
  // remote config behaves exactly like an unwrapped one.
  it('returns prod inside a provider when the flag supplies no host', () => {
    mockSelectHost.mockReturnValue(PRICE_API_BASE_URL);

    const { result } = renderHook(() => usePriceApiHost(), {
      wrapper: withProvider,
    });

    expect(result.current).toBe(PRICE_API_BASE_URL);
  });
});
