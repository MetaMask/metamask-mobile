import { CHAIN_IDS } from '@metamask/transaction-controller';
import { act } from '@testing-library/react-hooks';
import BN4 from 'bnjs4';
import { RootState } from '../../../../reducers';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../util/test/initial-root-state';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import useInputHandler, { InputHandlerParams } from './useInput';
import { isStablecoinLendingFeatureEnabled } from '../../Stake/constants';

// mock stablecoin lending feature flag
jest.mock('../../Stake/constants', () => ({
  isStablecoinLendingFeatureEnabled: jest.fn(() => false),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(() => 'USD'),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectChainId: jest.fn(() => '0x1'),
  selectEvmChainId: jest.fn(() => '0x1'),
  selectEvmNetworkConfigurationsByChainId: jest.fn(() => ({
    '0x1': {
      chainId: '0x1',
      nativeCurrency: 'ETH',
      rpcEndpoints: [{ networkClientId: 'mainnet' }],
    },
  })),
  selectIsAllNetworks: jest.fn(() => true),
  selectIsPopularNetwork: jest.fn(() => true),
}));

describe('useInputHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockInitialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
        MultichainNetworkController: {
          isEvmSelected: true,
          selectedMultichainNetworkChainId: undefined,
          multichainNetworkConfigurationsByChainId: {},
        },
        NetworkController: {
          selectedNetworkClientId: 'mainnet',
          networkConfigurationsByChainId: {
            [CHAIN_IDS.MAINNET]: {
              chainId: CHAIN_IDS.MAINNET,
              nativeCurrency: 'ETH',
              rpcEndpoints: [
                {
                  networkClientId: 'mainnet',
                },
              ],
              defaultBlockExplorerUrlIndex: 0,
              blockExplorerUrls: ['https://etherscan.io'],
            },
          },
        },
      },
    },
  };

  const defaultProps = {
    balance: '1000000000000000000', // 1 ETH
    decimals: 18,
    ticker: 'ETH',
    conversionRate: 2000, // 1 ETH = $2000
    exchangeRate: 1,
  };

  const renderHook = (
    state: DeepPartial<RootState> = mockInitialState,
    props = defaultProps,
  ) =>
    renderHookWithProvider(
      (overrideProps: DeepPartial<InputHandlerParams>) =>
        useInputHandler({ ...props, ...overrideProps }),
      { state },
    );

  it('should initialize with default values', () => {
    const { result } = renderHook();

    expect(result.current.amountToken).toBe('0');
    expect(result.current.amountTokenMinimalUnit).toEqual(new BN4(0));
    expect(result.current.amountFiatNumber).toBe('0');
    expect(result.current.isFiat).toBe(false);
    expect(result.current.isNonZeroAmount).toBe(false);
    expect(result.current.currentCurrency).toBe('USD');
    expect(result.current.currencyToggleValue).toBe('0 USD');
  });

  it('should initialize with default values with stablecoin lending enabled', () => {
    jest.mocked(isStablecoinLendingFeatureEnabled).mockReturnValue(true);

    const { result } = renderHook();

    expect(result.current.amountToken).toBe('0');
    expect(result.current.amountTokenMinimalUnit).toEqual(new BN4(0));
    expect(result.current.amountFiatNumber).toBe('0');
    expect(result.current.isFiat).toBe(false);
    expect(result.current.isNonZeroAmount).toBe(false);
    expect(result.current.currentCurrency).toBe('USD');
    expect(result.current.currencyToggleValue).toBe('$0');
  });

  it('should handle token input correctly', () => {
    const { result } = renderHook();

    act(() => {
      result.current.handleTokenInput('0.5');
    });

    expect(result.current.amountToken).toBe('0.5');
    expect(result.current.amountFiatNumber).toBe('1000'); // 0.5 ETH = $1000
    expect(result.current.amountTokenMinimalUnit).toEqual(
      new BN4('500000000000000000'),
    );
  });

  it('should handle fiat input correctly', () => {
    const { result } = renderHook();

    act(() => {
      result.current.handleFiatInput('1000');
    });

    expect(result.current.amountFiatNumber).toBe('1000');
    expect(result.current.amountToken).toBe('0.5'); // $1000 = 0.5 ETH
    expect(result.current.amountTokenMinimalUnit).toEqual(
      new BN4('500000000000000000'),
    );
  });

  it('should handle currency switch', () => {
    const { result } = renderHook();

    act(() => {
      result.current.handleCurrencySwitch();
    });

    expect(result.current.isFiat).toBe(true);
    expect(result.current.currencyToggleValue).toBe('0 ETH');
  });

  it('should handle keypad input with maximum digits', () => {
    const { result } = renderHook();

    // set the token input
    act(() => {
      result.current.handleTokenInput('123456789.123');
    });

    // change the token input
    act(() => {
      result.current.handleKeypadChange({
        value: '123456789.1234',
        pressedKey: '4',
      });
    });

    // The hook allows up to 12 digits total, including decimal places
    expect(result.current.amountToken).toBe('123456789.123');
  });

  it('should handle keypad input with maximum fraction digits', () => {
    const { result } = renderHook();

    act(() => {
      result.current.handleTokenInput('32.12345');
    });

    act(() => {
      result.current.handleKeypadChange({
        value: '32.123456',
        pressedKey: '6',
      });
    });

    // The hook allows up to 5 fraction digits total
    expect(result.current.amountToken).toBe('32.12345');
    expect(result.current.amountTokenMinimalUnit).toEqual(
      new BN4('32123450000000000000'),
    );
  });

  it('should handle keypad input when value is NaN', () => {
    // set balance to 10 wei
    const { result } = renderHook(undefined, {
      balance: '10',
      decimals: 18,
      ticker: 'ETH',
      conversionRate: 2000,
      exchangeRate: 1,
    });

    // quick press 25%
    act(() => {
      result.current.handleQuickAmountPress({ value: 0.25 });
    });

    // ui result should be < 0.00001 which is NaN
    expect(result.current.amountToken).toBe('< 0.00001');
    expect(result.current.amountTokenMinimalUnit).toEqual(new BN4('2'));

    // attempt to press 2 and value should reset to 2
    act(() => {
      result.current.handleKeypadChange({
        value: '< 0.000012',
        pressedKey: '2',
      });
    });

    expect(result.current.amountToken).toBe('2');
    expect(result.current.amountTokenMinimalUnit).toEqual(
      new BN4('2000000000000000000'),
    );
    expect(result.current.amountFiatNumber).toBe('4000');
  });

  it('should handle quick amount press', () => {
    const { result } = renderHook();

    act(() => {
      result.current.handleQuickAmountPress({ value: 0.5 }); // 50%
    });

    expect(result.current.amountToken).toBe('0.5');
    expect(result.current.amountFiatNumber).toBe('1000');
  });

  it('should handle max input', () => {
    const { result } = renderHook();
    const maxAmount = new BN4('1000000000000000000'); // 1 ETH

    act(() => {
      result.current.handleMaxInput(maxAmount);
    });

    expect(result.current.amountToken).toBe('1');
    expect(result.current.amountFiatNumber).toBe('2000');
  });

  it('should reset values when ticker changes', () => {
    const { result, rerender } = renderHook(mockInitialState, {
      ...defaultProps,
      ticker: 'ETH',
    });

    act(() => {
      result.current.handleTokenInput('1');
    });

    expect(result.current.amountToken).toBe('1');

    rerender({
      ...defaultProps,
      ticker: 'DAI',
    });

    expect(result.current.amountToken).toBe('0');
    expect(result.current.amountTokenMinimalUnit).toEqual(new BN4('0'));
    expect(result.current.amountFiatNumber).toBe('0');
  });
});
