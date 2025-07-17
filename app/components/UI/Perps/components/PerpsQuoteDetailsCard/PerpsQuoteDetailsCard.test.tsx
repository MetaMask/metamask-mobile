import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import PerpsQuoteDetailsCard from './PerpsQuoteDetailsCard';
import Routes from '../../../../../constants/navigation/Routes';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock KeyValueRow component
jest.mock(
  '../../../../../component-library/components-temp/KeyValueRow',
  () => {
    const { View, Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        field,
        value,
      }: {
        field: { label?: { text?: string } | React.ReactNode };
        value: { label: { text: string } };
      }) => {
        const labelText =
          typeof field.label === 'object' &&
          field.label &&
          'text' in field.label
            ? field.label.text
            : field.label;
        return (
          <View testID="key-value-row">
            {typeof labelText === 'string' ? (
              <Text>{labelText}</Text>
            ) : (
              labelText
            )}
            <Text>{value.label.text}</Text>
          </View>
        );
      },
      TooltipSizes: {
        Sm: 'Sm',
      },
    };
  },
);

// Mock Box component
jest.mock('../../../Box/Box', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => <View {...props}>{children}</View>,
  };
});

// Mock FlexDirection and AlignItems
jest.mock('../../../Box/box.types', () => ({
  FlexDirection: {
    Row: 'row',
  },
  AlignItems: {
    center: 'center',
  },
}));

// Mock Icon
jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="icon" />,
    IconName: {
      Edit: 'IconName.Edit',
    },
    IconSize: {
      Sm: 'IconSize.Sm',
    },
    IconColor: {
      Muted: 'IconColor.Muted',
    },
  };
});

// Mock Text component
jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <Text>{children}</Text>
    ),
    TextVariant: {
      BodyMDMedium: 'TextVariant.BodyMDMedium',
      BodyMD: 'TextVariant.BodyMD',
    },
  };
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      container: {},
      quoteDetails: {},
      quoteRow: {},
      slippageButton: {},
    },
  })),
}));

describe('PerpsQuoteDetailsCard', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
    (useSelector as jest.Mock).mockReturnValue(null); // Default slippage
  });

  it('should render all fields correctly', () => {
    const props = {
      networkFee: '$0.25',
      estimatedTime: '2-3 minutes',
      rate: '1 USDC = 1 USDC',
      metamaskFee: '$5.00',
    };

    const { getByText } = renderWithProvider(
      <PerpsQuoteDetailsCard {...props} />,
    );

    expect(getByText('perps.deposit.network_fee')).toBeTruthy();
    expect(getByText('$0.25')).toBeTruthy();
    expect(getByText('perps.deposit.metamask_fee')).toBeTruthy();
    expect(getByText('$5.00')).toBeTruthy();
    expect(getByText('perps.deposit.estimated_time')).toBeTruthy();
    expect(getByText('2-3 minutes')).toBeTruthy();
    expect(getByText('perps.deposit.rate')).toBeTruthy();
    expect(getByText('1 USDC = 1 USDC')).toBeTruthy();
    expect(getByText('perps.deposit.slippage')).toBeTruthy();
  });

  it('should render without estimatedTime', () => {
    const props = {
      networkFee: '$0.25',
      rate: '1 USDC = 1 USDC',
    };

    const { queryByText } = renderWithProvider(
      <PerpsQuoteDetailsCard {...props} />,
    );

    expect(queryByText('perps.deposit.estimated_time')).toBeNull();
  });

  it('should use default metamask fee when not provided', () => {
    const props = {
      networkFee: '$0.25',
      rate: '1 USDC = 1 USDC',
    };

    const { getByText } = renderWithProvider(
      <PerpsQuoteDetailsCard {...props} />,
    );

    expect(getByText('$0.00')).toBeTruthy(); // Default metamask fee
  });

  it('should display auto slippage when slippage is null', () => {
    const { getByText } = renderWithProvider(
      <PerpsQuoteDetailsCard networkFee="$0.25" rate="1 USDC = 1 USDC" />,
    );

    expect(getByText('perps.deposit.slippage_auto')).toBeTruthy();
  });

  it('should display auto slippage when slippage is undefined', () => {
    (useSelector as jest.Mock).mockReturnValue(undefined);

    const { getByText } = renderWithProvider(
      <PerpsQuoteDetailsCard networkFee="$0.25" rate="1 USDC = 1 USDC" />,
    );

    expect(getByText('perps.deposit.slippage_auto')).toBeTruthy();
  });

  it('should display custom slippage percentage', () => {
    (useSelector as jest.Mock).mockReturnValue(0.5);

    const { getByText } = renderWithProvider(
      <PerpsQuoteDetailsCard networkFee="$0.25" rate="1 USDC = 1 USDC" />,
    );

    expect(getByText('0.5%')).toBeTruthy();
  });

  it('should navigate to slippage modal when edit button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsQuoteDetailsCard networkFee="$0.25" rate="1 USDC = 1 USDC" />,
    );

    const editButton = getByTestId('edit-slippage-button');
    fireEvent.press(editButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.SLIPPAGE_MODAL,
    });
  });

  it('should render edit icon in slippage row', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsQuoteDetailsCard networkFee="$0.25" rate="1 USDC = 1 USDC" />,
    );

    const editIcon = getByTestId('icon');
    expect(editIcon).toBeTruthy();
  });

  it('should handle different slippage values', () => {
    const slippageValues = [0, 0.1, 0.5, 1, 2.5, 5];

    slippageValues.forEach((slippage) => {
      (useSelector as jest.Mock).mockReturnValue(slippage);

      const { getByText, unmount } = renderWithProvider(
        <PerpsQuoteDetailsCard networkFee="$0.25" rate="1 USDC = 1 USDC" />,
      );

      expect(getByText(`${slippage}%`)).toBeTruthy();
      unmount();
    });
  });

  it('should render with minimal props', () => {
    const { getByText } = renderWithProvider(
      <PerpsQuoteDetailsCard networkFee="$0.10" rate="1 ETH = 3000 USDC" />,
    );

    expect(getByText('$0.10')).toBeTruthy();
    expect(getByText('1 ETH = 3000 USDC')).toBeTruthy();
    expect(getByText('$0.00')).toBeTruthy(); // Default metamask fee
    expect(getByText('perps.deposit.slippage_auto')).toBeTruthy(); // Default slippage
  });
});
