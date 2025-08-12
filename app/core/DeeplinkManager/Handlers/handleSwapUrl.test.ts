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

  it('navigates to swaps page with correct pre-filled token information when valid CAIP-19 swap URLs are provided', async () => {
    const validSwapPath =
      '?from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&to=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7&value=0x38d7ea4c68000';

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

  it('navigates to swaps page with correct pre-filled token information when URLs without leading question mark are provided', async () => {
    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&to=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7';

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

  it('navigates to swaps page without pre-filled token information when invalid CAIP format is provided', async () => {
    const invalidSwapPath = '?from=invalid&to=invalid';

    handleSwapUrl({
      swapPath: invalidSwapPath,
      navigation: mockNavigation,
    });

    expect(mockNavigate).toHaveBeenCalledWith('Swaps', {
      screen: 'SwapsAmountView',
    });
  });

  it('navigates to swaps page without pre-filled token information when missing tokens are provided', async () => {
    const missingTokensPath = '?value=0x38d7ea4c68000';

    handleSwapUrl({
      swapPath: missingTokensPath,
      navigation: mockNavigation,
    });

    expect(mockNavigate).toHaveBeenCalledWith('Swaps', {
      screen: 'SwapsAmountView',
    });
  });

  it('navigates to swaps page with pre-filled amount of 0 when invalid hex value is provided', async () => {
    const invalidHexPath =
      '?from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&to=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7&value=invalid';

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

  it('navigates to swaps page without pre-filled token information when malformed path is provided', async () => {
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
