import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import { InternalAccount } from '@metamask/keyring-internal-api';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import AddRewardsAccount from './AddRewardsAccount';
import { useLinkAccountAddress } from '../../hooks/useLinkAccountAddress';

// Mock dependencies
jest.mock('../../hooks/useLinkAccountAddress', () => ({
  useLinkAccountAddress: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn(() => ({})),
  })),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock SVG - override the global SVG mock for this specific file
jest.mock(
  '../../../../../images/rewards/metamask-rewards-points-alternative.svg',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    const SvgComponent = ReactActual.forwardRef(
      (props: Record<string, unknown>, ref: unknown) =>
        ReactActual.createElement(View, {
          testID: 'metamask-rewards-points-alternative-image',
          ref,
          ...props,
        }),
    );

    SvgComponent.displayName = 'MetamaskRewardsPointsAlternativeImage';

    return SvgComponent;
  },
);

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

  const Box = ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => ReactActual.createElement(View, props, children);

  const TextComponent = ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => ReactActual.createElement(Text, props, children);

  const Button = ({
    children,
    onPress,
    testID,
    isDisabled,
    isLoading,
    startAccessory,
    ...props
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    testID?: string;
    isDisabled?: boolean;
    isLoading?: boolean;
    startAccessory?: React.ReactNode;
    [key: string]: unknown;
  }) =>
    ReactActual.createElement(
      TouchableOpacity,
      {
        onPress,
        testID,
        disabled: isDisabled,
        accessibilityState: {
          disabled: isDisabled || false,
          busy: isLoading || false,
        },
        ...props,
      },
      startAccessory,
      ReactActual.createElement(Text, {}, children),
    );

  return {
    Box,
    Text: TextComponent,
    Button,
    ButtonSize: {
      Sm: 'sm',
    },
    ButtonVariant: {
      Tertiary: 'tertiary',
    },
  };
});

const mockUseLinkAccountAddress = useLinkAccountAddress as jest.MockedFunction<
  typeof useLinkAccountAddress
>;

describe('AddRewardsAccount', () => {
  const mockLinkAccountAddress = jest.fn();

  const mockAccount: InternalAccount = {
    id: 'test-account-id',
    address: '0x1234567890123456789012345678901234567890',
    type: 'eip155:eoa',
    scopes: ['eip155:1'],
    options: {},
    methods: [],
    metadata: {
      name: 'Test Account',
      importTime: Date.now(),
      keyring: {
        type: 'HD Key Tree',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseLinkAccountAddress.mockReturnValue({
      linkAccountAddress: mockLinkAccountAddress,
      isLoading: false,
      isError: false,
    });
  });

  describe('Rendering', () => {
    it('renders button when account prop is provided', () => {
      const { getByTestId } = renderWithProvider(
        <AddRewardsAccount account={mockAccount} />,
      );

      expect(getByTestId('add-rewards-account')).toBeOnTheScreen();
    });

    it('returns null when account is not provided', () => {
      const { queryByTestId } = renderWithProvider(
        <AddRewardsAccount account={null as unknown as InternalAccount} />,
      );

      expect(queryByTestId('add-rewards-account')).toBeNull();
    });

    it('uses custom testID when provided', () => {
      const customTestID = 'custom-test-id';

      const { getByTestId } = renderWithProvider(
        <AddRewardsAccount account={mockAccount} testID={customTestID} />,
      );

      expect(getByTestId(customTestID)).toBeOnTheScreen();
    });

    it('calls useLinkAccountAddress with true parameter', () => {
      renderWithProvider(<AddRewardsAccount account={mockAccount} />);

      expect(mockUseLinkAccountAddress).toHaveBeenCalledWith(true);
    });
  });

  describe('Button Interactions', () => {
    it('calls linkAccountAddress when button is pressed', async () => {
      mockLinkAccountAddress.mockResolvedValue(true);

      const { getByTestId } = renderWithProvider(
        <AddRewardsAccount account={mockAccount} />,
      );

      await act(async () => {
        fireEvent.press(getByTestId('add-rewards-account'));
      });

      expect(mockLinkAccountAddress).toHaveBeenCalledWith(mockAccount);
    });

    it('does not call linkAccountAddress when account is not provided', () => {
      const { queryByTestId } = renderWithProvider(
        <AddRewardsAccount account={null as unknown as InternalAccount} />,
      );

      expect(queryByTestId('add-rewards-account')).toBeNull();
      expect(mockLinkAccountAddress).not.toHaveBeenCalled();
    });

    it('sets isSuccess state when linkAccountAddress succeeds', async () => {
      mockLinkAccountAddress.mockResolvedValue(true);

      const { getByTestId, queryByTestId } = renderWithProvider(
        <AddRewardsAccount account={mockAccount} />,
      );

      await act(async () => {
        fireEvent.press(getByTestId('add-rewards-account'));
        // Wait for promise to settle and state update
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Component should return null after successful link
      expect(queryByTestId('add-rewards-account')).toBeNull();
    });

    it('does not set isSuccess state when linkAccountAddress fails', async () => {
      mockLinkAccountAddress.mockResolvedValue(false);

      const { getByTestId } = renderWithProvider(
        <AddRewardsAccount account={mockAccount} />,
      );

      await act(async () => {
        fireEvent.press(getByTestId('add-rewards-account'));
      });

      // Component should still render after failed link
      expect(getByTestId('add-rewards-account')).toBeOnTheScreen();
    });
  });

  describe('Loading States', () => {
    it('disables button when isLoading is true', () => {
      mockUseLinkAccountAddress.mockReturnValue({
        linkAccountAddress: mockLinkAccountAddress,
        isLoading: true,
        isError: false,
      });

      const { getByTestId } = renderWithProvider(
        <AddRewardsAccount account={mockAccount} />,
      );

      const button = getByTestId('add-rewards-account');
      expect(button).toHaveProp('disabled', true);
    });

    it('enables button when isLoading is false', () => {
      mockUseLinkAccountAddress.mockReturnValue({
        linkAccountAddress: mockLinkAccountAddress,
        isLoading: false,
        isError: false,
      });

      const { getByTestId } = renderWithProvider(
        <AddRewardsAccount account={mockAccount} />,
      );

      const button = getByTestId('add-rewards-account');
      expect(button).toHaveProp('disabled', false);
    });

    it('shows loading state on button when isLoading is true', () => {
      mockUseLinkAccountAddress.mockReturnValue({
        linkAccountAddress: mockLinkAccountAddress,
        isLoading: true,
        isError: false,
      });

      const { getByTestId } = renderWithProvider(
        <AddRewardsAccount account={mockAccount} />,
      );

      const button = getByTestId('add-rewards-account');
      expect(button).toHaveProp('accessibilityState', {
        disabled: true,
        busy: true,
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles account becoming null after initial render', () => {
      const { rerender, queryByTestId } = renderWithProvider(
        <AddRewardsAccount account={mockAccount} />,
      );

      expect(queryByTestId('add-rewards-account')).toBeOnTheScreen();

      // Simulate account becoming null
      rerender(
        <AddRewardsAccount account={null as unknown as InternalAccount} />,
      );

      expect(queryByTestId('add-rewards-account')).toBeNull();
    });

    it('handles multiple rapid button presses', async () => {
      mockLinkAccountAddress.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(true), 100);
          }),
      );

      const { getByTestId } = renderWithProvider(
        <AddRewardsAccount account={mockAccount} />,
      );

      const button = getByTestId('add-rewards-account');

      await act(async () => {
        fireEvent.press(button);
        fireEvent.press(button);
        fireEvent.press(button);
      });

      // Should only be called once per press, but multiple times total
      expect(mockLinkAccountAddress).toHaveBeenCalled();
    });
  });

  describe('Success State', () => {
    it('hides component after successful account linking', async () => {
      mockLinkAccountAddress.mockResolvedValue(true);

      const { getByTestId, queryByTestId } = renderWithProvider(
        <AddRewardsAccount account={mockAccount} />,
      );

      expect(getByTestId('add-rewards-account')).toBeOnTheScreen();

      await act(async () => {
        fireEvent.press(getByTestId('add-rewards-account'));
      });

      // Wait for state update
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(queryByTestId('add-rewards-account')).toBeNull();
    });

    it('maintains success state across re-renders', async () => {
      mockLinkAccountAddress.mockResolvedValue(true);

      const { getByTestId, rerender, queryByTestId } = renderWithProvider(
        <AddRewardsAccount account={mockAccount} />,
      );

      await act(async () => {
        fireEvent.press(getByTestId('add-rewards-account'));
        // Wait for promise to settle
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Re-render with same props
      await act(async () => {
        rerender(<AddRewardsAccount account={mockAccount} />);
      });

      expect(queryByTestId('add-rewards-account')).toBeNull();
    });
  });
});
