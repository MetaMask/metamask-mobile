import { renderHook, act } from '@testing-library/react-hooks';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import engagementReducer from '../../../../../reducers/engagement';
import { useNotificationsPrePromptResolver } from './useNotificationsPrePromptResolver';

const mockUsePushPrePromptVariant = jest.fn();
jest.mock(
  '../../../../../util/notifications/hooks/usePushPrePromptVariant',
  () => ({
    usePushPrePromptVariant: () => mockUsePushPrePromptVariant(),
  }),
);

const makeStore = () =>
  configureStore({ reducer: { engagement: engagementReducer } });

const renderResolver = (store: ReturnType<typeof makeStore>) => {
  const { Provider } = jest.requireActual('react-redux');
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);
  return renderHook(() => useNotificationsPrePromptResolver(), { wrapper });
};

describe('useNotificationsPrePromptResolver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('dispatches resolving while the variant hook is resolving', () => {
    mockUsePushPrePromptVariant.mockReturnValue({
      isResolving: true,
      variant: null,
      markShown: jest.fn(),
      dismiss: jest.fn(),
    });

    const store = makeStore();
    renderResolver(store);

    expect(
      store.getState().engagement.startupSurfaces.statuses['push-pre-prompt'],
    ).toBe('resolving');
  });

  it('dispatches eligible when a variant is resolved', () => {
    mockUsePushPrePromptVariant.mockReturnValue({
      isResolving: false,
      variant: 'push_permission',
      markShown: jest.fn(),
      dismiss: jest.fn(),
    });

    const store = makeStore();
    renderResolver(store);

    expect(
      store.getState().engagement.startupSurfaces.statuses['push-pre-prompt'],
    ).toBe('eligible');
  });

  it('dispatches ineligible when variant is null and not resolving', () => {
    mockUsePushPrePromptVariant.mockReturnValue({
      isResolving: false,
      variant: null,
      markShown: jest.fn(),
      dismiss: jest.fn(),
    });

    const store = makeStore();
    renderResolver(store);

    expect(
      store.getState().engagement.startupSurfaces.statuses['push-pre-prompt'],
    ).toBe('ineligible');
  });

  it('transitions from resolving to eligible when variant appears', async () => {
    mockUsePushPrePromptVariant.mockReturnValue({
      isResolving: true,
      variant: null,
      markShown: jest.fn(),
      dismiss: jest.fn(),
    });

    const store = makeStore();
    const { rerender } = renderResolver(store);

    expect(
      store.getState().engagement.startupSurfaces.statuses['push-pre-prompt'],
    ).toBe('resolving');

    mockUsePushPrePromptVariant.mockReturnValue({
      isResolving: false,
      variant: 'marketing_consent',
      markShown: jest.fn(),
      dismiss: jest.fn(),
    });

    await act(async () => {
      rerender();
    });

    expect(
      store.getState().engagement.startupSurfaces.statuses['push-pre-prompt'],
    ).toBe('eligible');
  });
});
