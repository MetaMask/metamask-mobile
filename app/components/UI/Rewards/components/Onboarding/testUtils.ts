/* eslint-disable react/no-children-prop */
import React, { ReactElement } from 'react';
import { View } from 'react-native';
import { render, RenderOptions } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore, Store } from '@reduxjs/toolkit';

// Mock design system Tailwind hook
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const mockFn = jest.fn((styles: unknown) => {
      if (Array.isArray(styles)) {
        return styles.reduce((acc, style) => ({ ...acc, ...style }), {});
      }
      if (typeof styles === 'string') {
        return { testID: `tw-${styles}` };
      }
      return styles || {};
    });

    const tw = Object.assign(mockFn, {
      style: mockFn,
    });

    return tw;
  },
}));

// Type definitions for testing
export interface RootState {
  user: {
    appTheme: 'light' | 'dark';
  };
  rewards: {
    optinAllowedForGeo: boolean;
    optinAllowedForGeoLoading: boolean;
    onboardingActiveStep: string;
    rewardsControllerState: {
      activeAccount: {
        subscriptionId: string | null;
      } | null;
    };
  };
  engine: {
    backgroundState: {
      AccountsController: {
        selectedAccount: string;
        internalAccounts: {
          accounts: Record<string, unknown>;
          selectedAccount: string;
        };
      };
      RewardsController: {
        activeAccount: {
          subscriptionId: string | null;
          account: string | null;
          hasOptedIn: boolean | null;
        } | null;
      };
    };
  };
}

// Mock store configuration
export const createMockStore = (
  preloadedState: Partial<RootState> = {},
): Store => {
  const defaultState: RootState = {
    user: {
      appTheme: 'light' as const,
    },
    rewards: {
      optinAllowedForGeo: true,
      optinAllowedForGeoLoading: false,
      onboardingActiveStep: 'STEP_1',
      rewardsControllerState: {
        activeAccount: {
          subscriptionId: null,
        },
      },
    },
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            accounts: {
              'test-account': {
                id: 'test-account',
                type: 'eip155:eoa',
                address: '0x123',
                methods: [],
                options: {},
                metadata: {
                  name: 'Test Account',
                  keyring: {
                    type: 'HD Key Tree',
                  },
                },
              },
            },
            selectedAccount: 'test-account',
          },
          selectedAccount: 'test-account',
        },
        RewardsController: {
          activeAccount: {
            subscriptionId: null,
            account: 'eip155:1:0x123',
            hasOptedIn: false,
          },
        },
      },
    },
    ...preloadedState,
  };

  return configureStore({
    reducer: {
      user: (state = defaultState.user) => state,
      rewards: (state = defaultState.rewards) => state,
      engine: (state = defaultState.engine) => state,
    },
    preloadedState: defaultState,
  });
};

// Mock navigation setup - simplified for testing
const MockNavigationProvider = ({ children }: { children: React.ReactNode }) =>
  React.createElement(View, { testID: 'navigation-provider' }, children);

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<RootState>;
  store?: Store;
}

export const renderWithProviders = (
  ui: ReactElement,
  {
    preloadedState = {},
    store = createMockStore(preloadedState),
    ...renderOptions
  }: CustomRenderOptions = {},
) => {
  const Wrapper = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(Provider, {
      store,
      children: React.createElement(MockNavigationProvider, { children }),
    });

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

// Mock navigation object
export const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  getId: jest.fn(() => 'test'),
  getParent: jest.fn(),
  getState: jest.fn(),
});

// Mock dispatch function
export const createMockDispatch = () => jest.fn();

// Common test data
export const mockAccount = {
  id: 'test-account',
  type: 'eip155:eoa' as const,
  address: '0x123',
  methods: [],
  options: {},
  metadata: {
    name: 'Test Account',
    keyring: {
      type: 'HD Key Tree',
    },
  },
};

// Mock theme
export const mockTheme = {
  colors: {
    background: {
      muted: '#f5f5f5',
      default: '#ffffff',
    },
    text: {
      primary: '#000000',
      alternative: '#666666',
    },
    border: {
      muted: '#e0e0e0',
    },
  },
};
