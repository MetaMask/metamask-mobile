import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import AssetOverviewConvertSection from './AssetOverviewConvertSection';
import { AssetOverviewConvertSectionTestIds } from './AssetOverviewConvertSection.testIds';

const mockUseMusdConversionTokens = jest.fn();
const mockInitiateMaxConversion = jest.fn();
const mockInitiateCustomConversion = jest.fn();

jest.mock('../../hooks/useMusdConversionTokens', () => ({
  useMusdConversionTokens: () => mockUseMusdConversionTokens(),
}));

jest.mock('../../hooks/useMusdConversion', () => ({
  useMusdConversion: () => ({
    initiateMaxConversion: mockInitiateMaxConversion,
    initiateCustomConversion: mockInitiateCustomConversion,
  }),
}));

jest.mock(
  '../../../Money/components/MoneyConvertStablecoins/MoneyConvertStablecoins',
  () => {
    const { View, Text, Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        tokens,
        onMaxPress,
        onEditPress,
      }: {
        tokens: { symbol: string; address: string; chainId: string }[];
        onMaxPress: (token: unknown) => void;
        onEditPress: (token: unknown) => void;
      }) => (
        <View testID="money-convert-stablecoins-mock">
          {tokens.map((token) => (
            <View key={token.address}>
              <Pressable
                testID={`max-${token.symbol}`}
                onPress={() => onMaxPress(token)}
              >
                <Text>Max {token.symbol}</Text>
              </Pressable>
              <Pressable
                testID={`edit-${token.symbol}`}
                onPress={() => onEditPress(token)}
              >
                <Text>Edit {token.symbol}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ),
    };
  },
);

const TOKEN = {
  symbol: 'USDC',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
};

describe('AssetOverviewConvertSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMusdConversionTokens.mockReturnValue({ tokens: [TOKEN] });
  });

  it('renders the convert section container', () => {
    render(<AssetOverviewConvertSection />);
    expect(
      screen.getByTestId(AssetOverviewConvertSectionTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('forwards Max press to initiateMaxConversion', () => {
    render(<AssetOverviewConvertSection />);
    fireEvent.press(screen.getByTestId('max-USDC'));
    expect(mockInitiateMaxConversion).toHaveBeenCalledWith(TOKEN);
  });

  it('forwards Edit press to initiateCustomConversion with the preferred token', () => {
    render(<AssetOverviewConvertSection />);
    fireEvent.press(screen.getByTestId('edit-USDC'));
    expect(mockInitiateCustomConversion).toHaveBeenCalledWith(
      expect.objectContaining({
        preferredPaymentToken: {
          address: TOKEN.address,
          chainId: TOKEN.chainId,
        },
      }),
    );
  });
});
