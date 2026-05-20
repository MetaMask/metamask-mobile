import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react-native';
import engagementReducer, {
  surfaceStatusReported,
} from '../../../../reducers/engagement';
import InlineStartupSurface from './InlineStartupSurface';

const mockPushPrePromptVariant = jest.fn();
jest.mock(
  '../../../../util/notifications/hooks/usePushPrePromptVariant',
  () => ({
    usePushPrePromptVariant: () => mockPushPrePromptVariant(),
  }),
);

jest.mock('../../../Views/Notifications/PushNotificationOnboarding', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

const getPushMock = () =>
  jest.requireMock('../../../Views/Notifications/PushNotificationOnboarding')
    .default as jest.Mock;

const makeStore = () =>
  configureStore({ reducer: { engagement: engagementReducer } });

const renderSurface = (store: ReturnType<typeof makeStore>) =>
  render(
    <Provider store={store}>
      <InlineStartupSurface />
    </Provider>,
  );

describe('InlineStartupSurface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPushPrePromptVariant.mockReturnValue({
      isResolving: false,
      variant: null,
      markShown: jest.fn(),
      dismiss: jest.fn(),
    });
  });

  it('does not render PushNotificationOnboarding when no surface is active', () => {
    const store = makeStore();
    renderSurface(store);
    expect(getPushMock()).not.toHaveBeenCalled();
  });

  it('does not render PushNotificationOnboarding when active surface is not push-pre-prompt', () => {
    const store = makeStore();
    store.dispatch(
      surfaceStatusReported({ id: 'push-pre-prompt', status: 'ineligible' }),
    );
    store.dispatch(
      surfaceStatusReported({ id: 'perps-gtm', status: 'eligible' }),
    );
    renderSurface(store);
    expect(getPushMock()).not.toHaveBeenCalled();
  });

  it('renders PushNotificationOnboarding when push-pre-prompt is active and variant is present', () => {
    mockPushPrePromptVariant.mockReturnValue({
      isResolving: false,
      variant: 'push_permission',
      markShown: jest.fn(),
      dismiss: jest.fn(),
    });
    const store = makeStore();
    store.dispatch(
      surfaceStatusReported({ id: 'push-pre-prompt', status: 'eligible' }),
    );
    renderSurface(store);
    expect(getPushMock()).toHaveBeenCalled();
  });

  it('does not render PushNotificationOnboarding when push-pre-prompt is active but variant is null', () => {
    mockPushPrePromptVariant.mockReturnValue({
      isResolving: false,
      variant: null,
      markShown: jest.fn(),
      dismiss: jest.fn(),
    });
    const store = makeStore();
    store.dispatch(
      surfaceStatusReported({ id: 'push-pre-prompt', status: 'eligible' }),
    );
    renderSurface(store);
    expect(getPushMock()).not.toHaveBeenCalled();
  });
});
