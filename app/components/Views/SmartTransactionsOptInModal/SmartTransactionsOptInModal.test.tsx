/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import SmartTransactionsOptInModal from './SmartTranactionsOptInModal';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { shouldShowWhatsNewModal } from '../../../util/onboarding';
import { updateOptInModalAppVersionSeen } from '../../../core/redux/slices/smartTransactions';
import Routes from '../../../constants/navigation/Routes';

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

jest.mock('../../../core/redux/slices/smartTransactions', () => ({
  updateOptInModalAppVersionSeen: jest.fn(() => ({ type: 'hello' })),
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

    const description2 = getByText(strings('whats_new.stx.description_2'), {
      exact: false,
    });
    expect(description2).toBeDefined();

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
  it('should opt user out when secondary button is pressed and navigate to Advanced Settings', async () => {
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
    expect(updateOptInModalAppVersionSeen).toHaveBeenCalledWith(VERSION);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
        screen: Routes.SETTINGS.ADVANCED_SETTINGS,
      });
    });
  });
  it('should update last app version seen on primary button press', () => {
    const { getByText } = renderWithProvider(<SmartTransactionsOptInModal />, {
      state: initialState,
    });

    const primaryButton = getByText(strings('whats_new.stx.primary_button'));
    fireEvent.press(primaryButton);

    expect(updateOptInModalAppVersionSeen).toHaveBeenCalledWith(VERSION);
  });
  it('should update last app version seen on secondary button press', () => {
    const { getByText } = renderWithProvider(<SmartTransactionsOptInModal />, {
      state: initialState,
    });

    const secondaryButton = getByText(
      strings('whats_new.stx.secondary_button'),
    );
    fireEvent.press(secondaryButton);

    expect(updateOptInModalAppVersionSeen).toHaveBeenCalledWith(VERSION);
  });

  it("should not navigate to What's New modal", async () => {
    (shouldShowWhatsNewModal as jest.Mock).mockImplementation(
      async () => false,
    );

    const { getByText } = renderWithProvider(<SmartTransactionsOptInModal />, {
      state: initialState,
    });

    const primaryButton = getByText(strings('whats_new.stx.primary_button'));
    fireEvent.press(primaryButton);

    await wait(10);

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
