import React from 'react';
import { Text } from 'react-native';
import { act, render, renderHook } from '@testing-library/react-native';

import { BridgeTabKey } from '../../Views/BridgeView/BridgeView.constants';
import {
  BridgeSessionProvider,
  useBridgeSession,
} from './BridgeSessionContext';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../useLatestBalance', () => ({
  useLatestBalance: jest.fn(() => undefined),
}));

describe('useBridgeSession', () => {
  it('throws when used outside BridgeSessionProvider', () => {
    expect(() => renderHook(() => useBridgeSession())).toThrow(
      'useBridgeSession must be used within BridgeSessionProvider',
    );
  });

  it('defaults to Market and updates selectedTab and renderedTab independently', () => {
    const { result } = renderHook(() => useBridgeSession(), {
      wrapper: ({ children }) => (
        <BridgeSessionProvider>{children}</BridgeSessionProvider>
      ),
    });

    expect(result.current.selectedTab).toBe(BridgeTabKey.Market);
    expect(result.current.renderedTab).toBe(BridgeTabKey.Market);

    act(() => {
      result.current.setSelectedTab(BridgeTabKey.Limit);
    });

    expect(result.current.selectedTab).toBe(BridgeTabKey.Limit);
    expect(result.current.renderedTab).toBe(BridgeTabKey.Market);

    act(() => {
      result.current.setRenderedTab(BridgeTabKey.Limit);
    });

    expect(result.current.renderedTab).toBe(BridgeTabKey.Limit);
  });

  it('renders children', () => {
    const { getByText } = render(
      <BridgeSessionProvider>
        <Text>hosted</Text>
      </BridgeSessionProvider>,
    );

    expect(getByText('hosted')).toBeOnTheScreen();
  });
});
