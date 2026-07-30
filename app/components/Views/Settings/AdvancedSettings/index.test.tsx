import React from 'react';
import AdvancedSettings from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Device from '../../../../util/device';
import Routes from '../../../../constants/navigation/Routes';
import AppConstants from '../../../../core/AppConstants';
import { AdvancedViewSelectorsIDs } from './AdvancedView.testIds';
import { downloadStateLogs } from '../../../../util/logs';

jest.mock('../../../../util/logs', () => ({
  downloadStateLogs: jest.fn(),
}));

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

  it('opens the smart transactions information page', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValueOnce(undefined);
    const { getByText } = renderWithProvider(
      <AdvancedSettings navigation={defaultNavigation} />,
      { state: initialState },
    );

    fireEvent.press(
      getByText(strings('app_settings.smart_transactions_learn_more')),
    );

    expect(openUrlSpy).toHaveBeenCalledWith(AppConstants.URLS.SMART_TXS);
  });

  it('opens the fiat-on-testnets friction sheet when enabling fiat', () => {
    const { getByTestId } = renderWithProvider(
      <AdvancedSettings navigation={defaultNavigation} />,
      { state: initialState },
    );

    fireEvent(
      getByTestId(AdvancedViewSelectorsIDs.SHOW_FIAT_ON_TESTNETS),
      'onValueChange',
      true,
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      expect.objectContaining({
        screen: Routes.SHEET.FIAT_ON_TESTNETS_FRICTION,
      }),
    );
  });

  it('dispatches the fiat preference when disabling fiat', () => {
    const { getByTestId, store } = renderWithProvider(
      <AdvancedSettings navigation={defaultNavigation} />,
      {
        state: {
          ...initialState,
          settings: {
            ...initialState.settings,
            showFiatOnTestnets: true,
          },
        },
      },
    );

    fireEvent(
      getByTestId(AdvancedViewSelectorsIDs.SHOW_FIAT_ON_TESTNETS),
      'onValueChange',
      false,
    );

    expect(store.getState().settings.showFiatOnTestnets).toBe(false);
  });

  it('downloads the current application state', () => {
    const { getByText } = renderWithProvider(
      <AdvancedSettings navigation={defaultNavigation} />,
      { state: initialState },
    );

    fireEvent.press(getByText(strings('app_settings.state_logs_button')));

    expect(downloadStateLogs).toHaveBeenCalledWith(
      expect.objectContaining(initialState),
    );
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

      expect(mockSetSmartTransactionsOptInStatus).toHaveBeenCalledWith(false);
    });
  });
});
