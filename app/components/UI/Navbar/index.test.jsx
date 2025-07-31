/* eslint-disable react/prop-types */
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  getDepositNavbarOptions,
  getNetworkNavbarOptions,
  getOnboardingCarouselNavbarOptions,
  getOnboardingNavbarOptions,
  getTransparentOnboardingNavbarOptions,
  getSendFlowTitle,
} from '.';
import { mockTheme } from '../../../util/theme';
import Device from '../../../util/device';
import { View, TouchableOpacity } from 'react-native';

jest.mock('../../../util/device', () => ({
  isAndroid: jest.fn(),
  isIphoneX: jest.fn(),
  isIphone5S: jest.fn(),
  isIos: jest.fn(),
}));

jest.mock('../../../util/networks', () => ({
  isRemoveGlobalNetworkSelectorEnabled: jest.fn(),
  getNetworkNameFromProviderConfig: jest.fn(() => 'Ethereum Mainnet'),
}));

jest.mock('../../../core/Analytics', () => ({
  MetaMetrics: {
    getInstance: () => ({
      trackEvent: jest.fn(),
    }),
  },
  MetaMetricsEvents: {
    SEND_FLOW_CANCEL: 'send_flow_cancel',
  },
}));

jest.mock('../../../core/Analytics/MetricsEventBuilder', () => ({
  MetricsEventBuilder: {
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn(() => ({
        build: jest.fn(() => ({})),
      })),
    })),
  },
}));

jest.mock('../../../util/blockaid', () => ({
  getBlockaidTransactionMetricsParams: jest.fn(() => ({})),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

import { NETWORK_SELECTOR_SOURCES } from '../../../constants/networkSelector';

describe('getNetworkNavbarOptions', () => {
  const Stack = createStackNavigator();

  const mockNavigation = {
    pop: jest.fn(),
  };

  const TestNavigator = ({ options }) => (
    <Stack.Navigator>
      <Stack.Screen
        name="TestScreen"
        component={() => null}
        options={options}
      />
    </Stack.Navigator>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    Device.isAndroid.mockReset();
  });

  it('renders correctly with default options', () => {
    const options = getNetworkNavbarOptions(
      'Test Title',
      false,
      mockNavigation,
      mockTheme.colors,
    );

    const { getByText } = renderWithProvider(
      <TestNavigator options={options} />,
      {
        state: {
          engine: {
            backgroundState: {
              ...backgroundState,
            },
          },
        },
      },
    );

    expect(getByText('Test Title')).toBeTruthy();
  });
});

describe('getDepositNavbarOptions', () => {
  const mockNavigation = {
    pop: jest.fn(),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns navbar options with the correct title', () => {
    const options = getDepositNavbarOptions(
      mockNavigation,
      { title: 'Deposit' },
      mockTheme,
    );
    expect(options).toBeDefined();
    expect(options.title).toBe('Deposit');
  });

  it('deposit navbar options to pop when back button is pressed', () => {
    const options = getDepositNavbarOptions(
      mockNavigation,
      { title: 'Deposit' },
      mockTheme,
    );
    const headerLeftComponent = options.headerLeft();
    headerLeftComponent.props.onPress();
    expect(mockNavigation.pop).toHaveBeenCalledTimes(1);
  });
});

describe('get send flow title', () => {
  const mockNavigation = {
    pop: jest.fn(),
    dangerouslyGetParent: jest.fn(() => ({
      pop: jest.fn(),
    })),
  };

  const mockRoute = {
    params: {
      providerType: 'ethereum',
    },
  };

  const mockResetTransaction = jest.fn();
  const mockTransaction = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('source parameter behavior', () => {
    it('passes source="SendFlow" when global network selector is enabled', () => {
      const { isRemoveGlobalNetworkSelectorEnabled } = require('../../../util/networks');
      isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

      const options = getSendFlowTitle(
        'send.amount',
        mockNavigation,
        mockRoute,
        mockTheme.colors,
        mockResetTransaction,
        mockTransaction,
        true,
        true,
        'Ethereum Mainnet',
      );

      const headerTitleComponent = options.headerTitle();
      
      expect(headerTitleComponent.props.source).toBe(NETWORK_SELECTOR_SOURCES.SEND_FLOW);
    });

    it('passes source=undefined when global network selector is disabled', () => {
      const { isRemoveGlobalNetworkSelectorEnabled } = require('../../../util/networks');
      isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);

      const options = getSendFlowTitle(
        'send.amount',
        mockNavigation,
        mockRoute,
        mockTheme.colors,
        mockResetTransaction,
        mockTransaction,
        true,
        true,
        'Ethereum Mainnet',
      );

      const headerTitleComponent = options.headerTitle();
      
      expect(headerTitleComponent.props.source).toBeUndefined();
    });

    it('passes showSelectedNetwork when global network selector is enabled', () => {
      const { isRemoveGlobalNetworkSelectorEnabled } = require('../../../util/networks');
      isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

      const options = getSendFlowTitle(
        'send.amount',
        mockNavigation,
        mockRoute,
        mockTheme.colors,
        mockResetTransaction,
        mockTransaction,
        true,
        true,
        'Ethereum Mainnet',
      );

      const headerTitleComponent = options.headerTitle();
      
      expect(headerTitleComponent.props.showSelectedNetwork).toBe(true);
    });

    it('passes showSelectedNetwork=undefined when global network selector is disabled', () => {
      const { isRemoveGlobalNetworkSelectorEnabled } = require('../../../util/networks');
      isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);

      const options = getSendFlowTitle(
        'send.amount',
        mockNavigation,
        mockRoute,
        mockTheme.colors,
        mockResetTransaction,
        mockTransaction,
        true,
        true,
        'Ethereum Mainnet',
      );

      const headerTitleComponent = options.headerTitle();
      
      expect(headerTitleComponent.props.showSelectedNetwork).toBeUndefined();
    });

    it('passes networkName when global network selector is enabled', () => {
      const { isRemoveGlobalNetworkSelectorEnabled } = require('../../../util/networks');
      isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

      const contextualChainId = 'Ethereum Mainnet';
      const options = getSendFlowTitle(
        'send.amount',
        mockNavigation,
        mockRoute,
        mockTheme.colors,
        mockResetTransaction,
        mockTransaction,
        true,
        true,
        contextualChainId,
      );

      const headerTitleComponent = options.headerTitle();
      
      expect(headerTitleComponent.props.networkName).toBe(contextualChainId);
    });

    it('passes networkName=undefined when global network selector is disabled', () => {
      const { isRemoveGlobalNetworkSelectorEnabled } = require('../../../util/networks');
      isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);

      const options = getSendFlowTitle(
        'send.amount',
        mockNavigation,
        mockRoute,
        mockTheme.colors,
        mockResetTransaction,
        mockTransaction,
        true,
        true,
        'Ethereum Mainnet',
      );

      const headerTitleComponent = options.headerTitle();
      
      expect(headerTitleComponent.props.networkName).toBeUndefined();
    });
  });

  describe('basic functionality', () => {
    it('returns correct header structure', () => {
      const { isRemoveGlobalNetworkSelectorEnabled } = require('../../../util/networks');
      isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);

      const options = getSendFlowTitle(
        'send.amount',
        mockNavigation,
        mockRoute,
        mockTheme.colors,
        mockResetTransaction,
        mockTransaction,
      );

      expect(options).toHaveProperty('headerTitle');
      expect(options).toHaveProperty('headerLeft');
      expect(options).toHaveProperty('headerRight');
      expect(options).toHaveProperty('headerStyle');
    });

    it('passes correct title to NavbarTitle', () => {
      const { isRemoveGlobalNetworkSelectorEnabled } = require('../../../util/networks');
      isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);

      const title = 'send.amount';
      const options = getSendFlowTitle(
        title,
        mockNavigation,
        mockRoute,
        mockTheme.colors,
        mockResetTransaction,
        mockTransaction,
      );

      const headerTitleComponent = options.headerTitle();
      
      expect(headerTitleComponent.props.title).toBe(title);
    });

    it('passes disableNetwork prop correctly', () => {
      const { isRemoveGlobalNetworkSelectorEnabled } = require('../../../util/networks');
      isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);

      const disableNetwork = false;
      const options = getSendFlowTitle(
        'send.amount',
        mockNavigation,
        mockRoute,
        mockTheme.colors,
        mockResetTransaction,
        mockTransaction,
        disableNetwork,
      );

      const headerTitleComponent = options.headerTitle();
      
      expect(headerTitleComponent.props.disableNetwork).toBe(disableNetwork);
    });

    it('shows back button when not on send_to screen', () => {
      const { isRemoveGlobalNetworkSelectorEnabled } = require('../../../util/networks');
      isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);

      const options = getSendFlowTitle(
        'send.amount',
        mockNavigation,
        mockRoute,
        mockTheme.colors,
        mockResetTransaction,
        mockTransaction,
      );

      const headerLeftComponent = options.headerLeft();
      
      expect(headerLeftComponent).not.toBeNull();
      expect(headerLeftComponent.type).toBe(TouchableOpacity);
    });

    it('hides back button on send_to screen', () => {
      const { isRemoveGlobalNetworkSelectorEnabled } = require('../../../util/networks');
      isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);

      const options = getSendFlowTitle(
        'send.send_to',
        mockNavigation,
        mockRoute,
        mockTheme.colors,
        mockResetTransaction,
        mockTransaction,
      );

      const headerLeftComponent = options.headerLeft();
      
      expect(headerLeftComponent.type).toBe(View);
    });
  });
});

describe('getOnboardingCarouselNavbarOptions', () => {
  it('render onboarding carousel navbar options with default props', () => {
    const options = getOnboardingCarouselNavbarOptions();
    expect(options).toBeDefined();
  });

  it('render onboarding carousel navbar options with custom background color', () => {
    const options = getOnboardingCarouselNavbarOptions('red');
    expect(options.headerStyle.backgroundColor).toBe('red');
  });
});

describe('getTransparentOnboardingNavbarOptions', () => {
  const mockNavigation = {
    pop: jest.fn(),
    goBack: jest.fn(),
  };

  it('render transparent onboarding navbar options', () => {
    const options = getTransparentOnboardingNavbarOptions(
      mockTheme,
      'red',
      true,
      'blue',
    );
    expect(options).toBeDefined();
  });

  it('render transparent onboarding navbar options with custom background color', () => {
    const options = getTransparentOnboardingNavbarOptions(
      mockTheme,
      'red',
      true,
      'blue',
    );
    expect(options.headerStyle.backgroundColor).toBe('red');
  });

  it('handles getOnboardingNavbarOptions', () => {
    const options = getOnboardingNavbarOptions(
      mockNavigation,
      { headerLeft: () => <View />, headerRight: () => <View /> },
      mockTheme.colors,
      true,
    );
    expect(options).toBeDefined();
  });
});

describe('getOnboardingNavbarOptions', () => {
  const mockNavigation = {
    pop: jest.fn(),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render onboarding navbar options with default props', () => {
    const options = getOnboardingNavbarOptions(
      mockNavigation,
      { headerLeft: () => <View />, headerRight: () => <View /> },
      mockTheme.colors,
      true,
    );
    expect(options).toBeDefined();
  });
});
