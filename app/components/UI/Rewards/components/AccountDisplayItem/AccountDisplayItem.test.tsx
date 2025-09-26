// Additional edge case tests for AccountDisplayItem
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import AccountDisplayItem from './AccountDisplayItem';

// Mock external dependencies
jest.mock('../../../../../component-library/components/Avatars/Avatar', () => ({
  __esModule: true,
  default: jest.fn(() => {
    const MockedAvatar = () => null;
    return <MockedAvatar />;
  }),
  AvatarAccountType: {
    Blockies: 'blockies',
    JazzIcon: 'jazzicon',
  },
  AvatarSize: {
    Sm: '24',
    Md: '32',
    Lg: '40',
  },
  AvatarVariant: {
    Account: 'account',
  },
}));

jest.mock('@metamask/design-system-react-native', () => ({
  Box: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => children,
  TextVariant: {
    BodyMd: 'BodyMd',
    BodySm: 'BodySm',
  },
  FontWeight: {
    Regular: 'regular',
    Medium: 'medium',
    Bold: 'bold',
  },
  BoxFlexDirection: {
    Row: 'row',
  },
  BoxAlignItems: {
    Center: 'center',
  },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(),
  }),
}));

const createMockStore = (useBlockieIcon = false) =>
  configureStore({
    reducer: {
      settings: () => ({
        useBlockieIcon,
      }),
    },
  });

const mockAccount = {
  id: '1',
  address: '0x1234567890123456789012345678901234567890',
  metadata: {
    name: 'Test Account',
    importTime: Date.now(),
    keyring: {
      type: 'HD Key Tree',
    },
  },
  options: {},
  methods: [],
  type: 'eip155:eoa' as const,
  scopes: ['eip155:1' as const],
};

describe('AccountDisplayItem - Edge Cases', () => {
  const renderWithProvider = (
    component: React.ReactElement,
    useBlockieIcon = false,
  ) => {
    const store = createMockStore(useBlockieIcon);
    return render(<Provider store={store}>{component}</Provider>);
  };

  describe('Error boundaries and edge cases', () => {
    it('should handle account without metadata', () => {
      const accountWithoutMetadata = {
        ...mockAccount,
        metadata: {
          name: '',
          importTime: Date.now(),
          keyring: { type: '' },
        },
      };

      const component = <AccountDisplayItem account={accountWithoutMetadata} />;

      expect(() => renderWithProvider(component)).not.toThrow();
    });

    it('should handle very long account names', () => {
      const longNameAccount = {
        ...mockAccount,
        metadata: {
          ...mockAccount.metadata,
          name: 'This is a very long account name that should be handled properly by the component without breaking the layout or causing any rendering issues',
          importTime: Date.now(),
        },
      };

      const component = <AccountDisplayItem account={longNameAccount} />;

      expect(() => renderWithProvider(component)).not.toThrow();
    });

    it('should handle account with missing address', () => {
      const accountWithoutAddress = {
        ...mockAccount,
        address: '' as string,
      };

      const component = <AccountDisplayItem account={accountWithoutAddress} />;

      expect(() => renderWithProvider(component)).not.toThrow();
    });
  });

  describe('Component unmounting', () => {
    it('should clean up properly when unmounted', () => {
      const { unmount } = renderWithProvider(
        <AccountDisplayItem account={mockAccount} />,
      );

      expect(() => unmount()).not.toThrow();
    });
  });
});
