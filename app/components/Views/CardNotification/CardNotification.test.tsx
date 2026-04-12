import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import CardNotification from './CardNotification';
import { ToastContext } from '../../../component-library/components/Toast';
import { ToastVariants } from '../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../component-library/components/Icons/Icon';

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

describe('CardNotification', () => {
  const createToastRef = () => ({
    current: { showToast: jest.fn(), closeToast: jest.fn() },
  });

  const renderWithProviders = (toastRef = createToastRef()) => {
    const ui = (
      <ToastContext.Provider value={{ toastRef }}>
        <CardNotification />
      </ToastContext.Provider>
    );

    const utils = render(ui);
    return { ...utils, toastRef };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack.mockClear();
  });

  it('renders without crashing', () => {
    const { toastRef } = renderWithProviders();

    expect(toastRef.current).toBeDefined();
  });

  it('displays toast with correct configuration when toastRef is available', async () => {
    const { toastRef } = renderWithProviders();

    await waitFor(() => {
      expect(toastRef.current.showToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        labelOptions: [{ label: 'card.card_button_enabled_toast' }],
        hasNoTimeout: false,
        iconName: IconName.Info,
      });
    });
  });

  it('calls navigation goBack after showing toast', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  it('does not show toast when toastRef is null', () => {
    const nullToastRef = {
      current: null,
    } as unknown as {
      current: { showToast: jest.Mock; closeToast: jest.Mock };
    };
    const { toastRef } = renderWithProviders(nullToastRef);

    expect(toastRef.current).toBeNull();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('shows toast only once on multiple renders', async () => {
    const { toastRef, rerender } = renderWithProviders();

    await waitFor(() => {
      expect(toastRef.current.showToast).toHaveBeenCalledTimes(1);
    });

    rerender(
      <ToastContext.Provider value={{ toastRef }}>
        <CardNotification />
      </ToastContext.Provider>,
    );

    await waitFor(() => {
      expect(toastRef.current.showToast).toHaveBeenCalledTimes(1);
    });
  });

  it('translates toast label using i18n strings', async () => {
    const mockStrings = jest.requireMock('../../../../locales/i18n').strings;
    const { toastRef } = renderWithProviders();

    await waitFor(() => {
      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_button_enabled_toast',
      );
      expect(toastRef.current.showToast).toHaveBeenCalled();
    });
  });

  it('renders empty fragment as component output', () => {
    const { toJSON } = renderWithProviders();

    expect(toJSON()).toBeNull();
  });
});
