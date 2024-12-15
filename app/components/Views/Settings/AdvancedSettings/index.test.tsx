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
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockSetSmartTransactionsOptInStatus: jest.Mock<any, any>;

beforeEach(() => {
  initialState = {
    settings: { showHexData: true },
    engine: {
      backgroundState,
    },
  };
  mockNavigate.mockClear();
  mockSetSmartTransactionsOptInStatus.mockClear();
});

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    navigation: {
      navigate: mockNavigate,
    },
  };
});

const mockEngine = Engine;

jest.mock('../../../../core/Engine', () => {
  mockSetSmartTransactionsOptInStatus = jest.fn();
  return {
    init: () => mockEngine.init({}),
    context: {
      PreferencesController: {
        setSmartTransactionsOptInStatus: mockSetSmartTransactionsOptInStatus,
      },
    },
  };
});

describe('AdvancedSettings', () => {
  it('should render correctly', () => {
    const container = renderWithProvider(
      <AdvancedSettings
        navigation={{ navigate: mockNavigate, setOptions: jest.fn() }}
      />,
      {
        state: initialState,
      },
    );
    expect(container).toMatchSnapshot();
  });

  describe('Smart Transactions Opt In', () => {
    afterEach(() => {
      global.fetch = originalFetch;
    });

    Device.isIos = jest.fn().mockReturnValue(true);
    Device.isAndroid = jest.fn().mockReturnValue(false);

    it('should render smart transactions opt in switch on by default', async () => {
      const { findByLabelText } = renderWithProvider(
        <AdvancedSettings
          navigation={{ navigate: mockNavigate, setOptions: jest.fn() }}
        />,
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
        <AdvancedSettings
          navigation={{ navigate: mockNavigate, setOptions: jest.fn() }}
        />,
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
