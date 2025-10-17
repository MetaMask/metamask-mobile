/**
 * Tests for usePerpsConnection hook
 */

import { renderHook } from '@testing-library/react-hooks';
import { useContext } from 'react';
import { usePerpsConnection } from './usePerpsConnection';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    if (key === 'perps.errors.connectionRequired') {
      return 'Perps connection context is required';
    }
    return key;
  }),
}));

describe('usePerpsConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws error when used outside provider', () => {
    (useContext as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => {
      try {
        return usePerpsConnection();
      } catch (error) {
        return { error };
      }
    });

    expect(result.current).toHaveProperty('error');
    expect((result.current as { error: Error }).error.message).toBe(
      'Perps connection context is required',
    );
  });

  it('returns connection context when used inside provider', () => {
    const mockContext = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      reconnectWithNewContext: jest.fn(),
      connectionState: {
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        isDisconnecting: false,
        isInGracePeriod: false,
        error: null,
      },
    };
    (useContext as jest.Mock).mockReturnValue(mockContext);

    const { result } = renderHook(() => usePerpsConnection());

    expect(result.current).toBe(mockContext);
    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
    expect(typeof result.current.reconnectWithNewContext).toBe('function');
  });
});
