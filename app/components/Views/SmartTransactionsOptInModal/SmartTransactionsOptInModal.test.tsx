/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import SmartTransactionsOptInModal from './SmartTranactionsOptInModal';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import AsyncStorage from '../../../store/async-storage-wrapper';
import { SMART_TRANSACTIONS_OPT_IN_MODAL_APP_VERSION_SEEN } from '../../../constants/storage';
import { shouldShowWhatsNewModal } from '../../../util/onboarding';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
    }),
  };
});

jest.mock('../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setSmartTransactionsOptInStatus: jest.fn(),
    },
  },
}));

const VERSION = '1.0.0';
jest.mock('../../../store/async-storage-wrapper', () => ({
  getItem: jest.fn(() => VERSION),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../../../util/onboarding', () => ({
  shouldShowWhatsNewModal: jest.fn(),
}));

const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('SmartTransactionsOptInModal', () => {
  afterEach(() => {
    mockNavigate.mockReset();
  });

  it('should render properly', () => {
    const { getByText } = renderWithProvider(<SmartTransactionsOptInModal />, {
      state: initialState,
    });

    const header = getByText(strings('whats_new.stx.header'));
    expect(header).toBeDefined();

    const description1 = getByText(strings('whats_new.stx.description_1'));
    expect(description1).toBeDefined();

    const description2 = getByText(strings('whats_new.stx.description_2'));
    expect(description2).toBeDefined();

    const description3 = getByText(strings('whats_new.stx.description_3'), {
      exact: false,
    });
    expect(description3).toBeDefined();

    const primaryButton = getByText(strings('whats_new.stx.primary_button'));
    expect(primaryButton).toBeDefined();

    const secondaryButton = getByText(
      strings('whats_new.stx.secondary_button'),
    );
    expect(secondaryButton).toBeDefined();
  });
  it('should opt user in when primary button is pressed', () => {
    const { getByText } = renderWithProvider(<SmartTransactionsOptInModal />, {
      state: initialState,
    });

    const primaryButton = getByText(strings('whats_new.stx.primary_button'));
    fireEvent.press(primaryButton);

    expect(
      Engine.context.PreferencesController.setSmartTransactionsOptInStatus,
    ).toHaveBeenCalledWith(true);
  });
  it('should opt user out when secondary button is pressed', () => {
    const { getByText } = renderWithProvider(<SmartTransactionsOptInModal />, {
      state: initialState,
    });

    const secondaryButton = getByText(
      strings('whats_new.stx.secondary_button'),
    );
    fireEvent.press(secondaryButton);

    expect(
      Engine.context.PreferencesController.setSmartTransactionsOptInStatus,
    ).toHaveBeenCalledWith(false);
  });
  it('should save last app version seen on primary button press', () => {
    const { getByText } = renderWithProvider(<SmartTransactionsOptInModal />, {
      state: initialState,
    });

    const primaryButton = getByText(strings('whats_new.stx.primary_button'));
    fireEvent.press(primaryButton);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      SMART_TRANSACTIONS_OPT_IN_MODAL_APP_VERSION_SEEN,
      VERSION,
    );
  });
  it('should save last app version seen on secondary button press', () => {
    const { getByText } = renderWithProvider(<SmartTransactionsOptInModal />, {
      state: initialState,
    });

    const secondaryButton = getByText(
      strings('whats_new.stx.secondary_button'),
    );
    fireEvent.press(secondaryButton);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      SMART_TRANSACTIONS_OPT_IN_MODAL_APP_VERSION_SEEN,
      VERSION,
    );
  });

  it("should navigate to What's New modal if required", async () => {
    // @ts-ignore
    shouldShowWhatsNewModal.mockImplementation(async () => true);

    const { getByText } = renderWithProvider(<SmartTransactionsOptInModal />, {
      state: initialState,
    });

    const primaryButton = getByText(strings('whats_new.stx.primary_button'));
    fireEvent.press(primaryButton);

    // Need this since shouldShowWhatsNewModal is an async fn and is awaited on
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.WHATS_NEW,
      });
    });
  });
  it("should not navigate to What's New modal if not required", async () => {
    // @ts-ignore
    shouldShowWhatsNewModal.mockImplementation(async () => false);

    const { getByText } = renderWithProvider(<SmartTransactionsOptInModal />, {
      state: initialState,
    });

    const primaryButton = getByText(strings('whats_new.stx.primary_button'));
    fireEvent.press(primaryButton);

    await wait(10);

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
