import {
  getErc20TokenAddressListFromConfig,
  isEvmTokenAddress,
  isValidErc20TokenAddressList,
} from './erc20TokenAddressList';

const ETH_USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const ETH_USDC_ADDRESS_LOWERCASE = ETH_USDC_ADDRESS.toLowerCase();

describe('isEvmTokenAddress', () => {
  it('returns true for a prefixed EVM address', () => {
    const result = isEvmTokenAddress(ETH_USDC_ADDRESS);

    expect(result).toBe(true);
  });

  it('returns false for a non-EVM address', () => {
    const result = isEvmTokenAddress(
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    );

    expect(result).toBe(false);
  });
});

describe('isValidErc20TokenAddressList', () => {
  it('returns true for explicit EVM chain and address entries', () => {
    const tokenAddressList = {
      '0x1': [ETH_USDC_ADDRESS],
    };

    const result = isValidErc20TokenAddressList(tokenAddressList);

    expect(result).toBe(true);
  });

  it.each([
    ['a wildcard chain', { '*': [ETH_USDC_ADDRESS] }],
    ['a wildcard address', { '0x1': ['*'] }],
    ['a non-EVM chain ID', { 'solana:mainnet': [ETH_USDC_ADDRESS] }],
    [
      'a non-EVM token address',
      { '0x1': ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'] },
    ],
    ['a non-array chain value', { '0x1': ETH_USDC_ADDRESS }],
  ])('returns false for %s', (_description, tokenAddressList) => {
    const result = isValidErc20TokenAddressList(tokenAddressList);

    expect(result).toBe(false);
  });
});

describe('getErc20TokenAddressListFromConfig', () => {
  const remoteFlagName = 'earnMoneyDepositCtaTokenAddresses';
  const localEnvName = 'MM_MONEY_DEPOSIT_CTA_TOKEN_ADDRESSES';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normalizes remote chain and address casing', () => {
    const result = getErc20TokenAddressListFromConfig(
      { '0X1': [ETH_USDC_ADDRESS] },
      remoteFlagName,
      undefined,
      localEnvName,
    );

    expect(result).toEqual({
      '0x1': [ETH_USDC_ADDRESS_LOWERCASE],
    });
  });

  it('normalizes leading zeros in remote chain IDs', () => {
    const result = getErc20TokenAddressListFromConfig(
      { '0x01': [ETH_USDC_ADDRESS] },
      remoteFlagName,
      undefined,
      localEnvName,
    );

    expect(result).toEqual({
      '0x1': [ETH_USDC_ADDRESS_LOWERCASE],
    });
  });

  it('uses remote config before a local environment override', () => {
    const result = getErc20TokenAddressListFromConfig(
      { '0x1': [ETH_USDC_ADDRESS] },
      remoteFlagName,
      '{"0x1":["0xdAC17F958D2ee523a2206206994597C13D831ec7"]}',
      localEnvName,
    );

    expect(result).toEqual({
      '0x1': [ETH_USDC_ADDRESS_LOWERCASE],
    });
  });

  it('logs malformed remote config before using a valid local override', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation();

    const result = getErc20TokenAddressListFromConfig(
      { '*': [ETH_USDC_ADDRESS] },
      remoteFlagName,
      `{"0x1":["${ETH_USDC_ADDRESS}"]}`,
      localEnvName,
    );

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(`Remote ${remoteFlagName}`),
    );
    expect(result).toEqual({
      '0x1': [ETH_USDC_ADDRESS_LOWERCASE],
    });
  });

  it('returns an empty map after logging malformed remote and local config', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation();

    const result = getErc20TokenAddressListFromConfig(
      { '0x1': ['*'] },
      remoteFlagName,
      '{"0x1":',
      localEnvName,
    );

    expect(warn).toHaveBeenCalledTimes(2);
    expect(result).toEqual({});
  });
});
