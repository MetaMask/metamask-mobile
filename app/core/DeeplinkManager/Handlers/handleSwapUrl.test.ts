import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { handleSwapUrl } from './handleSwapUrl';

describe('handleSwapUrl', () => {
  const mockNavigate = jest.fn();
  const mockNavigation = {
    navigate: mockNavigate,
  } as unknown as NavigationProp<ParamListBase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle valid CAIP-19 swap URLs correctly', async () => {
    const validSwapPath =
      '?fromToken=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&toToken=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7&value=0x38d7ea4c68000';

    handleSwapUrl({
      swapPath: validSwapPath,
      navigation: mockNavigation,
    });

    expect(mockNavigate).toHaveBeenCalledWith('Swaps', {
      screen: 'SwapsAmountView',
      params: {
        sourceToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        destinationToken: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        amount: '0x38d7ea4c68000',
      },
    });
  });

  it('should handle URLs without leading question mark', async () => {
    const swapPath =
      'fromToken=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&toToken=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7';

    handleSwapUrl({
      swapPath,
      navigation: mockNavigation,
    });

    expect(mockNavigate).toHaveBeenCalledWith('Swaps', {
      screen: 'SwapsAmountView',
      params: {
        sourceToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        destinationToken: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        amount: '0',
      },
    });
  });

  it('should handle invalid CAIP format by navigating to SwapsAmountView without params', async () => {
    const invalidSwapPath = '?fromToken=invalid&toToken=invalid';

    handleSwapUrl({
      swapPath: invalidSwapPath,
      navigation: mockNavigation,
    });

    expect(mockNavigate).toHaveBeenCalledWith('Swaps', {
      screen: 'SwapsAmountView',
    });
  });

  it('should handle missing tokens by navigating to SwapsAmountView without params', async () => {
    const missingTokensPath = '?value=0x38d7ea4c68000';

    handleSwapUrl({
      swapPath: missingTokensPath,
      navigation: mockNavigation,
    });

    expect(mockNavigate).toHaveBeenCalledWith('Swaps', {
      screen: 'SwapsAmountView',
    });
  });

  it('should handle invalid hex value by setting amount to 0', async () => {
    const invalidHexPath =
      '?fromToken=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&toToken=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7&value=invalid';

    handleSwapUrl({
      swapPath: invalidHexPath,
      navigation: mockNavigation,
    });

    expect(mockNavigate).toHaveBeenCalledWith('Swaps', {
      screen: 'SwapsAmountView',
      params: {
        sourceToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        destinationToken: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        amount: '0',
      },
    });
  });

  it('should handle errors by navigating to SwapsAmountView without params', async () => {
    const malformedPath = null;

    handleSwapUrl({
      // @ts-expect-error - this scenario is not expected to happen
      swapPath: malformedPath,
      navigation: mockNavigation,
    });

    expect(mockNavigate).toHaveBeenCalledWith('Swaps', {
      screen: 'SwapsAmountView',
    });
  });
});
