import { renderHook, act } from '@testing-library/react-hooks';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import engagementReducer, {
  surfaceStatusReported,
} from '../../../../reducers/engagement';
import { useStartupSurfacePresenter } from './useStartupSurfacePresenter';

const mockNavigate = jest.fn();
jest.mock('../../../../core/NavigationService', () => ({
  __esModule: true,
  default: { navigation: { navigate: mockNavigate } },
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

  it('does not throw when the inline push pre-prompt surface becomes active', () => {
    const store = makeStore();
    renderPresenter(store);

    act(() => {
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'eligible' }),
      );
    });

    expect(store.getState().engagement.startupSurfaces.activeSurfaceId).toBe(
      'push-pre-prompt',
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it.each(['perps-gtm', 'predict-gtm'] as const)(
    'does not navigate for placeholder navigation-backed surface %s before routes are registered',
    (id) => {
      const store = makeStore();
      renderPresenter(store);

      act(() => {
        store.dispatch(
          surfaceStatusReported({
            id: 'push-pre-prompt',
            status: 'ineligible',
          }),
        );
        store.dispatch(surfaceStatusReported({ id, status: 'eligible' }));
      });

      expect(store.getState().engagement.startupSurfaces.activeSurfaceId).toBe(
        id,
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    },
  );
});
