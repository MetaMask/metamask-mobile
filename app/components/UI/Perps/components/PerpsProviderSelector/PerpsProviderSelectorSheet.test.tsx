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

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      optionsList: {},
      optionRow: {},
      optionRowSelected: {},
      optionContent: {},
      optionNameRow: {},
      optionName: {},
      testnetTag: {},
      testnetDot: {},
      checkIcon: {},
    },
  }),
}));

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockText = ({ children, ...props }: any) => (
    <RNText {...props}>{children}</RNText>
  );
  MockText.displayName = 'Text';
  return {
    __esModule: true,
    default: MockText,
    TextVariant: {
      HeadingMD: 'HeadingMD',
      BodyMDMedium: 'BodyMDMedium',
      BodyXS: 'BodyXS',
      BodySM: 'BodySM',
    },
    TextColor: { Alternative: 'Alternative', Warning: 'Warning' },
  };
});

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: (props: any) => <View testID="icon" {...props} />,
    IconName: { Check: 'Check' },
    IconSize: { Md: 'Md' },
    IconColor: { Primary: 'Primary' },
  };
});

/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    const mockReact = jest.requireActual('react') as any;
    const MockBottomSheet = mockReact.forwardRef(
      ({ children, onClose, testID }: any, _ref: any) => (
        <View testID={testID} onTouchEnd={onClose}>
          {children}
        </View>
      ),
    );
    MockBottomSheet.displayName = 'BottomSheet';
    return { __esModule: true, default: MockBottomSheet };
  },
);
/* eslint-enable @typescript-eslint/no-explicit-any */

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View } = jest.requireActual('react-native');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      __esModule: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      default: ({ children, onClose }: any) => (
        <View>
          {children}
          <View testID="header-close" onTouchEnd={onClose} />
        </View>
      ),
    };
  },
);

const mockUsePerpsProvider = usePerpsProvider as jest.Mock;

const defaultProps = {
  isVisible: true,
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
  it('returns null when not visible', () => {
    const { toJSON } = render(
      <PerpsProviderSelectorSheet {...defaultProps} isVisible={false} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders when visible', () => {
    const { getByTestId } = render(
      <PerpsProviderSelectorSheet {...defaultProps} />,
    );

    expect(getByTestId('provider-sheet')).toBeTruthy();
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

  it('shows check icon for selected option', () => {
    const { getByTestId } = render(
      <PerpsProviderSelectorSheet
        {...defaultProps}
        selectedOptionId="hyperliquid-mainnet"
      />,
    );

    expect(
      getByTestId('provider-sheet-check-hyperliquid-mainnet'),
    ).toBeTruthy();
  });

  it('shows testnet tag for testnet options', () => {
    const { getAllByText } = render(
      <PerpsProviderSelectorSheet {...defaultProps} />,
    );

    // Testnet network label is rendered for testnet options
    expect(getAllByText('Testnet').length).toBeGreaterThan(0);
  });
});
