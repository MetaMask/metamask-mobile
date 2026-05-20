import { renderHook, act } from '@testing-library/react-hooks';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import engagementReducer from '../../../../../reducers/engagement';
import { usePredictGtmResolver } from './usePredictGtmResolver';
import { PREDICT_GTM_MODAL_SHOWN } from '../../../../../constants/storage';

const mockSelectPredictEnabledFlag = jest.fn().mockReturnValue(true);
const mockSelectPredictGtmOnboardingModalEnabledFlag = jest
  .fn()
  .mockReturnValue(true);

jest.mock('../../../Predict/selectors/featureFlags', () => ({
  selectPredictEnabledFlag: (state: unknown) =>
    mockSelectPredictEnabledFlag(state),
  selectPredictGtmOnboardingModalEnabledFlag: (state: unknown) =>
    mockSelectPredictGtmOnboardingModalEnabledFlag(state),
}));

const mockGetItem = jest.fn();
jest.mock('../../../../../store/storage-wrapper', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
}));

const makeStore = () =>
  configureStore({ reducer: { engagement: engagementReducer } });

const renderResolver = (store: ReturnType<typeof makeStore>) => {
  const { Provider } = jest.requireActual('react-redux');
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);
  return renderHook(() => usePredictGtmResolver(), { wrapper });
};

describe('usePredictGtmResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectPredictEnabledFlag.mockReturnValue(true);
    mockSelectPredictGtmOnboardingModalEnabledFlag.mockReturnValue(true);
  });

  it('dispatches ineligible when feature is disabled', () => {
    mockSelectPredictEnabledFlag.mockReturnValue(false);
    const store = makeStore();
    renderResolver(store);
    expect(
      store.getState().engagement.startupSurfaces.statuses['predict-gtm'],
    ).toBe('ineligible');
  });

  it('dispatches eligible when feature is enabled and modal not shown', async () => {
    mockGetItem.mockResolvedValue('false');
    const store = makeStore();
    await act(async () => {
      renderResolver(store);
    });
    expect(
      store.getState().engagement.startupSurfaces.statuses['predict-gtm'],
    ).toBe('eligible');
    expect(mockGetItem).toHaveBeenCalledWith(PREDICT_GTM_MODAL_SHOWN);
  });

  it('dispatches ineligible when modal has been shown', async () => {
    mockGetItem.mockResolvedValue('true');
    const store = makeStore();
    await act(async () => {
      renderResolver(store);
    });
    expect(
      store.getState().engagement.startupSurfaces.statuses['predict-gtm'],
    ).toBe('ineligible');
  });

  it('dispatches ineligible when storage read fails', async () => {
    mockGetItem.mockRejectedValue(new Error('storage error'));
    const store = makeStore();
    await act(async () => {
      renderResolver(store);
    });
    expect(
      store.getState().engagement.startupSurfaces.statuses['predict-gtm'],
    ).toBe('ineligible');
  });
});
