import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';
import PerpsProviderSelectorSheet from './PerpsProviderSelectorSheet';

jest.mock('../../hooks/usePerpsProvider', () => ({
  usePerpsProvider: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        testID,
        goBack,
      }: {
        children?: React.ReactNode;
        testID?: string;
        goBack?: () => void;
      },
      ref: React.Ref<{
        onCloseBottomSheet: (callback?: () => void) => void;
        onOpenBottomSheet: (callback?: () => void) => void;
      }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: (callback?: () => void) => {
          callback?.();
          goBack?.();
        },
        onOpenBottomSheet: (callback?: () => void) => {
          callback?.();
        },
      }));

      return <View testID={testID}>{children}</View>;
    },
  );
  MockBottomSheet.displayName = 'BottomSheet';

  return {
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: ({
      children,
      onClose,
    }: {
      children?: React.ReactNode;
      onClose?: () => void;
    }) => (
      <View>
        <Text>{children}</Text>
        <Pressable testID="header-close" onPress={onClose} />
      </View>
    ),
    ListItemSelect: ({
      title,
      description,
      titleEndAccessory,
      onPress,
      testID,
      isSelected,
      accessibilityRole,
      accessibilityState,
    }: {
      title?: string;
      description?: string;
      titleEndAccessory?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
      isSelected?: boolean;
      accessibilityRole?: string;
      accessibilityState?: { selected?: boolean };
    }) => (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
      >
        <Text>{title}</Text>
        {titleEndAccessory}
        <Text>{description}</Text>
        {isSelected ? <View testID={`${testID}-selected`} /> : null}
      </Pressable>
    ),
    Tag: ({
      children,
      severity,
    }: {
      children?: React.ReactNode;
      severity?: string;
    }) => <Text testID={`tag-${severity}`}>{children}</Text>,
    TagSeverity: {
      Warning: 'Warning',
      Neutral: 'Neutral',
    },
  };
});

const mockUsePerpsProvider = usePerpsProvider as jest.Mock;

const defaultProps = {
  onClose: jest.fn(),
  onOptionSelect: jest.fn(),
  testID: 'provider-sheet',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePerpsProvider.mockReturnValue({
    availableProviders: ['hyperliquid', 'myx'],
  });
});

describe('PerpsProviderSelectorSheet', () => {
  it('renders the sheet', () => {
    const { getByTestId } = render(
      <PerpsProviderSelectorSheet {...defaultProps} />,
    );

    expect(getByTestId('provider-sheet')).toBeOnTheScreen();
  });

  it('renders the title string in the header', () => {
    const { getByText } = render(
      <PerpsProviderSelectorSheet {...defaultProps} />,
    );

    expect(getByText('perps.provider_selector.title')).toBeOnTheScreen();
  });

  it('renders only options matching availableProviders', () => {
    mockUsePerpsProvider.mockReturnValue({
      availableProviders: ['hyperliquid'],
    });

    const { getAllByText, queryByText } = render(
      <PerpsProviderSelectorSheet {...defaultProps} />,
    );

    expect(getAllByText('HyperLiquid').length).toBeGreaterThan(0);
    expect(queryByText('MYX')).toBeNull();
  });

  it('renders all matching options when all providers available', () => {
    mockUsePerpsProvider.mockReturnValue({
      availableProviders: ['hyperliquid', 'myx'],
    });

    const { getAllByText } = render(
      <PerpsProviderSelectorSheet {...defaultProps} />,
    );

    expect(getAllByText('HyperLiquid').length).toBeGreaterThan(0);
    expect(getAllByText('MYX').length).toBeGreaterThan(0);
  });

  it('calls onOptionSelect when an option is pressed', async () => {
    const onOptionSelect = jest.fn().mockResolvedValue(undefined);

    const { getByTestId } = render(
      <PerpsProviderSelectorSheet
        {...defaultProps}
        onOptionSelect={onOptionSelect}
      />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('provider-sheet-option-hyperliquid-mainnet'));
    });

    expect(onOptionSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'hyperliquid-mainnet',
        providerId: 'hyperliquid',
      }),
    );
  });

  it('marks the selected option as selected', () => {
    const { getByTestId } = render(
      <PerpsProviderSelectorSheet
        {...defaultProps}
        selectedOptionId="hyperliquid-mainnet"
      />,
    );

    expect(
      getByTestId('provider-sheet-option-hyperliquid-mainnet-selected'),
    ).toBeOnTheScreen();
  });

  it('renders Mainnet and Testnet tags', () => {
    const { getAllByText, getAllByTestId } = render(
      <PerpsProviderSelectorSheet {...defaultProps} />,
    );

    expect(getAllByText('Testnet').length).toBeGreaterThan(0);
    expect(getAllByText('Mainnet').length).toBeGreaterThan(0);
    expect(getAllByTestId('tag-Warning').length).toBeGreaterThan(0);
    expect(getAllByTestId('tag-Neutral').length).toBeGreaterThan(0);
  });

  it('closes the sheet when header close is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <PerpsProviderSelectorSheet {...defaultProps} onClose={onClose} />,
    );

    fireEvent.press(getByTestId('header-close'));

    expect(onClose).toHaveBeenCalled();
  });
});
