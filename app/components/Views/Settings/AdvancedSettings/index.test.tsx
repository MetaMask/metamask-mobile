import React from 'react';
import AdvancedSettings from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Device from '../../../../util/device';

const originalFetch = global.fetch;

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let initialState: any;
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockSetSmartTransactionsOptInStatus: jest.Mock<any, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockDismissSmartAccountSuggestionEnabled: jest.Mock<any, any>;

const defaultNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  setOptions: jest.fn(),
};

beforeEach(() => {
  initialState = {
    settings: { showHexData: true },
    engine: {
      backgroundState,
    },
  };
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockSetSmartTransactionsOptInStatus.mockClear();
});

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    navigation: {
      navigate: mockNavigate,
    },
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const mockEngine = Engine;

jest.mock('../../../../core/Engine', () => {
  mockSetSmartTransactionsOptInStatus = jest.fn();
  mockDismissSmartAccountSuggestionEnabled = jest.fn();
  return {
    init: () => mockEngine.init(''),
    context: {
      PreferencesController: {
        setSmartTransactionsOptInStatus: mockSetSmartTransactionsOptInStatus,
        setDismissSmartAccountSuggestionEnabled:
          mockDismissSmartAccountSuggestionEnabled,
      },
    },
  };
});

describe('AdvancedSettings', () => {
  it('should render correctly', () => {
    const { getByText } = renderWithProvider(
      <AdvancedSettings navigation={defaultNavigation} />,
      {
        state: initialState,
      },
    );
    expect(getByText(strings('app_settings.advanced_title'))).toBeOnTheScreen();
  });

  it('renders header with correct title', () => {
    const { getByText } = renderWithProvider(
      <AdvancedSettings navigation={defaultNavigation} />,
      { state: initialState },
    );

    expect(getByText(strings('app_settings.advanced_title'))).toBeOnTheScreen();
  });

  it('calls navigation.goBack when back button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <AdvancedSettings navigation={defaultNavigation} />,
      { state: initialState },
    );
    const backButton = getByTestId('button-icon');

    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  describe('Smart Transactions Opt In', () => {
    afterEach(() => {
      global.fetch = originalFetch;
    });

    Device.isIos = jest.fn().mockReturnValue(true);
    Device.isAndroid = jest.fn().mockReturnValue(false);

    it('should render smart account dapp requests toggle on by default', async () => {
      const { findByLabelText } = renderWithProvider(
        <AdvancedSettings navigation={defaultNavigation} />,
        {
          state: initialState,
        },
      );

      const switchElement = await findByLabelText(
        strings('app_settings.smart_account_dapp_requests_heading'),
      );
      expect(switchElement.props.value).toBe(true);
    });

    it('should set dismissSmartAccountSuggestionEnabled to true when smart account dapp requests toggle is turned off', async () => {
      const { findByLabelText } = renderWithProvider(
        <AdvancedSettings navigation={defaultNavigation} />,
        {
          state: initialState,
        },
      );

      const switchElement = await findByLabelText(
        strings('app_settings.smart_account_dapp_requests_heading'),
      );

      fireEvent(switchElement, 'onValueChange', false);

      expect(mockDismissSmartAccountSuggestionEnabled).toHaveBeenCalledWith(
        true,
      );
    });

    it('should render smart transactions opt in switch on by default', async () => {
      const { findByLabelText } = renderWithProvider(
        <AdvancedSettings navigation={defaultNavigation} />,
        {
          state: initialState,
        },
      );

      const switchElement = await findByLabelText(
        strings('app_settings.smart_transactions_opt_in_heading'),
      );
      expect(switchElement.props.value).toBe(true);
    });

    it('should update smartTransactionsOptInStatus when smart transactions opt in is pressed', async () => {
      const { findByLabelText } = renderWithProvider(
        <AdvancedSettings navigation={defaultNavigation} />,
        {
          state: initialState,
        },
      );

      const switchElement = await findByLabelText(
        strings('app_settings.smart_transactions_opt_in_heading'),
      );

      fireEvent(switchElement, 'onValueChange', false);

      expect(mockSetSmartTransactionsOptInStatus).toBeCalledWith(false);
    });
  });
});
