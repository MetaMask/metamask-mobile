import { renderHook, act } from '@testing-library/react-hooks';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import engagementReducer, {
  surfaceStatusReported,
  surfaceCompleted,
} from '../../../../reducers/engagement';
import { useStartupSurfacePresenter } from './useStartupSurfacePresenter';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const makeStore = () =>
  configureStore({ reducer: { engagement: engagementReducer } });

const renderPresenter = (store: ReturnType<typeof makeStore>) => {
  const { Provider } = jest.requireActual('react-redux');
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);
  return renderHook(() => useStartupSurfacePresenter(), { wrapper });
};

describe('useStartupSurfacePresenter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('navigates to the Perps GTM modal when perps-gtm becomes active', () => {
    const store = makeStore();
    renderPresenter(store);

    act(() => {
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'ineligible' }),
      );
      store.dispatch(
        surfaceStatusReported({ id: 'perps-gtm', status: 'eligible' }),
      );
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('navigates only once per activation (ref-guard)', () => {
    const store = makeStore();
    renderPresenter(store);

    act(() => {
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'ineligible' }),
      );
      store.dispatch(
        surfaceStatusReported({ id: 'perps-gtm', status: 'eligible' }),
      );
    });

    act(() => {
      store.dispatch(
        surfaceStatusReported({ id: 'predict-gtm', status: 'ineligible' }),
      );
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('navigates again after completing and a new surface becomes active', () => {
    const store = makeStore();
    renderPresenter(store);

    act(() => {
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'ineligible' }),
      );
      store.dispatch(
        surfaceStatusReported({ id: 'perps-gtm', status: 'eligible' }),
      );
      store.dispatch(
        surfaceStatusReported({ id: 'predict-gtm', status: 'eligible' }),
      );
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);

    act(() => {
      store.dispatch(surfaceCompleted({ id: 'perps-gtm' }));
    });

    expect(mockNavigate).toHaveBeenCalledTimes(2);
  });

  it('does not navigate for inline surfaces (push-pre-prompt)', () => {
    const store = makeStore();
    renderPresenter(store);

    act(() => {
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'eligible' }),
      );
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
