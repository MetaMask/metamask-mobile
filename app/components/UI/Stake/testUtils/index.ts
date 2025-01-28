import { CHAIN_IDS } from '@metamask/transaction-controller';

export const HOLESKY_CHAIN_ID = '0x4268';

export const createMockToken =
  (chainId: (typeof CHAIN_IDS)[keyof typeof CHAIN_IDS]) =>
  (name: string, symbol: string, isStaked = false) => {
    const isETH = symbol === 'ETH' || symbol === 'Ethereum';

    const nativeChainIds = [
      CHAIN_IDS.MAINNET,
      CHAIN_IDS.SEPOLIA,
      HOLESKY_CHAIN_ID,
    ];
    const isNative = nativeChainIds.includes(chainId) && isETH;

    return {
      address: '0xabc',
      aggregators: [],
      balance: '',
      balanceFiat: '',
      chainId,
      decimals: 0,
      image: '',
      isETH,
      isNative,
      isStaked,
      logo: '',
      name,
      symbol,
      ticker: symbol,
    };
  };

export const createMainnetMockToken = createMockToken(CHAIN_IDS.MAINNET);
