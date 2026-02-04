/**
 * Tests for PerpsWebSocketHealthToast.context
 */

import React from 'react';
import { Text } from 'react-native';
import { renderHook, act } from '@testing-library/react-hooks';
import { render } from '@testing-library/react-native';
import {
  WebSocketHealthToastProvider,
  useWebSocketHealthToastContext,
  WebSocketHealthToastContext,
} from './PerpsWebSocketHealthToast.context';
import { WebSocketConnectionState } from '../../controllers/types';

describe('PerpsWebSocketHealthToast.context', () => {
  describe('WebSocketHealthToastProvider', () => {
    it('renders children correctly', () => {
      const { getByText } = render(
        <WebSocketHealthToastProvider>
          <Text>Test Child</Text>
        </WebSocketHealthToastProvider>,
      );

      expect(getByText('Test Child')).toBeTruthy();
    });
  });

  describe('useWebSocketHealthToastContext', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WebSocketHealthToastProvider>{children}</WebSocketHealthToastProvider>
    );

    it('has correct initial state', () => {
      const { result } = renderHook(() => useWebSocketHealthToastContext(), {
        wrapper,
      });

      expect(result.current.state).toEqual({
        isVisible: false,
        connectionState: WebSocketConnectionState.Disconnected,
        reconnectionAttempt: 0,
      });
    });

    describe('show()', () => {
      it('updates visibility and connection state', () => {
        const { result } = renderHook(() => useWebSocketHealthToastContext(), {
          wrapper,
        });

        act(() => {
          result.current.show(WebSocketConnectionState.Connecting, 1);
        });

        expect(result.current.state).toEqual({
          isVisible: true,
          connectionState: WebSocketConnectionState.Connecting,
          reconnectionAttempt: 1,
        });
      });

      it('updates reconnection attempt number', () => {
        const { result } = renderHook(() => useWebSocketHealthToastContext(), {
          wrapper,
        });

        act(() => {
          result.current.show(WebSocketConnectionState.Connecting, 5);
        });

        expect(result.current.state.reconnectionAttempt).toBe(5);
      });

      it('defaults reconnectionAttempt to 0 when not provided', () => {
        const { result } = renderHook(() => useWebSocketHealthToastContext(), {
          wrapper,
        });

        act(() => {
          result.current.show(WebSocketConnectionState.Connected);
        });

        expect(result.current.state.reconnectionAttempt).toBe(0);
      });

      it('handles DISCONNECTED state', () => {
        const { result } = renderHook(() => useWebSocketHealthToastContext(), {
          wrapper,
        });

        act(() => {
          result.current.show(WebSocketConnectionState.Disconnected, 3);
        });

        expect(result.current.state).toEqual({
          isVisible: true,
          connectionState: WebSocketConnectionState.Disconnected,
          reconnectionAttempt: 3,
        });
      });

      it('handles CONNECTED state', () => {
        const { result } = renderHook(() => useWebSocketHealthToastContext(), {
          wrapper,
        });

        act(() => {
          result.current.show(WebSocketConnectionState.Connected, 0);
        });

        expect(result.current.state).toEqual({
          isVisible: true,
          connectionState: WebSocketConnectionState.Connected,
          reconnectionAttempt: 0,
        });
      });
    });

    describe('hide()', () => {
      it('sets visibility to false', () => {
        const { result } = renderHook(() => useWebSocketHealthToastContext(), {
          wrapper,
        });

        // First show the toast
        act(() => {
          result.current.show(WebSocketConnectionState.Disconnected, 1);
        });

        expect(result.current.state.isVisible).toBe(true);

        // Then hide it
        act(() => {
          result.current.hide();
        });

        expect(result.current.state.isVisible).toBe(false);
      });

      it('preserves other state when hiding', () => {
        const { result } = renderHook(() => useWebSocketHealthToastContext(), {
          wrapper,
        });

        // Show with specific state
        act(() => {
          result.current.show(WebSocketConnectionState.Connecting, 2);
        });

        // Hide
        act(() => {
          result.current.hide();
        });

        // Other state properties should be preserved
        expect(result.current.state.connectionState).toBe(
          WebSocketConnectionState.Connecting,
        );
        expect(result.current.state.reconnectionAttempt).toBe(2);
        expect(result.current.state.isVisible).toBe(false);
      });

      it('when hide({ userDismissed: true }), subsequent Disconnected is suppressed but Connecting and Connected show again', () => {
        const { result } = renderHook(() => useWebSocketHealthToastContext(), {
          wrapper,
        });

        act(() => {
          result.current.show(WebSocketConnectionState.Disconnected, 1);
        });
        expect(result.current.state.isVisible).toBe(true);

        act(() => {
          result.current.hide({ userDismissed: true });
        });
        expect(result.current.state.isVisible).toBe(false);

        // Showing Disconnected again should not show (user dismissed offline)
        act(() => {
          result.current.show(WebSocketConnectionState.Disconnected, 2);
        });
        expect(result.current.state.isVisible).toBe(false);

        // Showing Connecting should show (user sees reconnection progress)
        act(() => {
          result.current.show(WebSocketConnectionState.Connecting, 3);
        });
        expect(result.current.state.isVisible).toBe(true);

        // Showing Connected shows "online" toast and clears userDismissed
        act(() => {
          result.current.show(WebSocketConnectionState.Connected, 0);
        });
        expect(result.current.state.isVisible).toBe(true);

        act(() => {
          result.current.hide();
        });
        // Next Disconnected will show again (userDismissed was cleared)
        act(() => {
          result.current.show(WebSocketConnectionState.Disconnected, 4);
        });
        expect(result.current.state.isVisible).toBe(true);
      });
    });

    describe('setOnRetry()', () => {
      it('registers retry callback', () => {
        const { result } = renderHook(() => useWebSocketHealthToastContext(), {
          wrapper,
        });

        const mockCallback = jest.fn();

        act(() => {
          result.current.setOnRetry(mockCallback);
        });

        expect(result.current.onRetry).toBe(mockCallback);
      });

      it('allows onRetry callback to be called', () => {
        const { result } = renderHook(() => useWebSocketHealthToastContext(), {
          wrapper,
        });

        const mockCallback = jest.fn();

        act(() => {
          result.current.setOnRetry(mockCallback);
        });

        // Call the registered callback
        act(() => {
          result.current.onRetry?.();
        });

        expect(mockCallback).toHaveBeenCalled();
      });

      it('allows updating the retry callback', () => {
        const { result } = renderHook(() => useWebSocketHealthToastContext(), {
          wrapper,
        });

        const firstCallback = jest.fn();
        const secondCallback = jest.fn();

        act(() => {
          result.current.setOnRetry(firstCallback);
        });

        act(() => {
          result.current.setOnRetry(secondCallback);
        });

        expect(result.current.onRetry).toBe(secondCallback);
      });
    });

    describe('onRetry', () => {
      it('is undefined initially', () => {
        const { result } = renderHook(() => useWebSocketHealthToastContext(), {
          wrapper,
        });

        expect(result.current.onRetry).toBeUndefined();
      });

      it('is accessible from context after setOnRetry', () => {
        const { result } = renderHook(() => useWebSocketHealthToastContext(), {
          wrapper,
        });

        const mockCallback = jest.fn();

        act(() => {
          result.current.setOnRetry(mockCallback);
        });

        expect(result.current.onRetry).toBeDefined();
        expect(typeof result.current.onRetry).toBe('function');
      });
    });
  });

  describe('Default context values', () => {
    it('has default noop functions in context', () => {
      // Test using context directly without provider
      const { result } = renderHook(() =>
        React.useContext(WebSocketHealthToastContext),
      );

      // Default values should exist and not throw
      expect(result.current.state).toEqual({
        isVisible: false,
        connectionState: WebSocketConnectionState.Disconnected,
        reconnectionAttempt: 0,
      });

      // Default functions should be no-ops
      expect(() => {
        result.current.show(WebSocketConnectionState.Connected);
        result.current.hide();
        result.current.setOnRetry(() => undefined);
      }).not.toThrow();

      // onRetry should be undefined by default
      expect(result.current.onRetry).toBeUndefined();
    });
  });
});
