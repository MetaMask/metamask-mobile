import axios from 'axios';
import { ethers } from 'ethers';
import Tenderly from '../../../tenderly';
import { getAddress } from 'ethers/lib/utils';
import Assertions from '../../../utils/Assertions';
import WalletView from '../../../pages/wallet/WalletView';
import { MockApiEndpoint } from '../../../framework/types';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';

export interface TokenDetails {
  address: string;
  decimals: number;
  name: string;
  symbol: string;
  image: string;
  aggregators: string[];
  occurrences: number;
}

function toChecksumAddress(address: string): string {
  try {
    return getAddress(address);
  } catch (error) {
    throw new Error('Invalid Ethereum address');
  }
}

function getTokenAddressFrom(chainId: string, ticker: string): string {
  const tokenAddresses: Record<string, Record<string, string>> = {
    '0x1': {
      // Mainnet (1)
      DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      // Receipt tokens
      ADAI: '0x018008bfb33d285247a21d44e50697654f754e63',
      AUSDC: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
      AUSDT: '0x23878914EFE38d27C4D67Ab83ed1b93A74D4086a',
    },
    '0x38': {
      // Binance Smart Chain (56)
      USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      USDT: '0x55d398326f99059fF775485246999027B3197955',
      // Receipt tokens
      ABNBUSDC: '0x00901a076785e0906d1028c7d6372d247bec7d61',
      ABNBUSDT: '0xa9251ca9DE909CB71783723713B21E4233fbf1B1',
    },
    '0xe708': {
      // Linea (59144)
      USDC: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
      USDT: '0xA219439258ca9da29E9Cc4cE5596924745e12B93',
      // Receipt tokens
      AUSDC: '0x374D7860c4f2f604De0191298dD393703Cce84f3',
      ALINUSDT: '0x88231dfEC71D4FF5c1e466D08C321944A7adC673',
    },
    '0x2105': {
      // Base (8453)
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      // Receipt tokens
      AUSDC: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB',
    },
    '0xa4b1': {
      // Arbitrum (42161)
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT0: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      // Receipt tokens
      ADAI: '0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE',
      AUSDC: '0x724dc807b04555b71ed48a6896b6F41593b8C637',
      AUSDT: '0x6ab707Aca953eDAeFBc4fD23bA73294241490620',
    },
  };
  return tokenAddresses[chainId]?.[ticker] || '0x';
}

const CHAIN_ID_TO_INFURA_URL_MAPPING: Record<string, string> = {
  '0x1': `https://mainnet.infura.io/v3/null`,
  '0x38': 'https://bsc-dataseed.bnbchain.org',
  '0x2105': `https://base-mainnet.infura.io/v3/null`,
  '0xe708': `https://linea-mainnet.infura.io/v3/null`,
  '0xa4b1': `https://arbitrum-mainnet.infura.io/v3/null`,
};

export async function getMarkets(
  chainId: string,
  srcTokenAddr: string,
  dstTokenAddr: string,
  rate: number,
): Promise<MockApiEndpoint> {
  const chainIdDec = parseInt(chainId, 16);
  const srcTokenAddrLw = srcTokenAddr.toLowerCase();
  const dstTokenAddrLw = dstTokenAddr.toLowerCase();
  console.log(
    `Generated markets for token: ${srcTokenAddrLw} chainId: ${chainId}`,
  );
  return {
    responseCode: 200,
    urlEndpoint: 'https://staking.api.cx.metamask.io/v1/lending/markets',
    response: {
      markets: [
        {
          id: dstTokenAddrLw,
          chainId: chainIdDec,
          protocol: 'aave',
          name: dstTokenAddrLw,
          address: dstTokenAddrLw,
          netSupplyRate: rate,
          totalSupplyRate: rate,
          rewards: [],
          tvlUnderlying: '179076330981934055169152348',
          underlying: {
            address: srcTokenAddrLw,
            chainId: chainIdDec,
          },
          outputToken: {
            address: dstTokenAddrLw,
            chainId: chainIdDec,
          },
        },
      ],
    },
  };
}

export async function proxyInfuraRequests(
  chainId: string,
  rpcUlr: string,
): Promise<MockApiEndpoint> {
  const urlEndpoint = CHAIN_ID_TO_INFURA_URL_MAPPING[chainId] || rpcUlr;
  console.log(
    `Proxying url: ${urlEndpoint} via url: ${rpcUlr} for chainId: ${chainId}`,
  );
  return {
    urlEndpoint,
    response: {},
    proxyUrl: rpcUlr,
    responseCode: 200,
  };
}

export async function getNativeTokenDetails(
  chainId: string,
): Promise<TokenDetails> {
  const response = await axios.get(
    `https://token.api.cx.metamask.io/token/${parseInt(
      chainId,
      16,
    )}?address=0x0000000000000000000000000000000000000000`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
  return {
    address: toChecksumAddress(response.data.address),
    decimals: response.data.decimals,
    name: response.data.name,
    symbol: response.data.symbol,
    image: response.data.iconUrl || '',
    aggregators: response.data.aggregators || [],
    occurrences: response.data.occurrences || 0,
  };
}

export async function getTokenDetails(
  chainId: string,
  ticker: string,
): Promise<TokenDetails> {
  const tokenAddress = getTokenAddressFrom(chainId, ticker);
  if (tokenAddress === '0x') {
    throw new Error(`Token ${ticker} not found for chain ID ${chainId}`);
  }
  const response = await axios.get(
    `https://token.api.cx.metamask.io/token/${parseInt(
      chainId,
      16,
    )}?address=${tokenAddress}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
  return {
    address: toChecksumAddress(response.data.address),
    decimals: response.data.decimals,
    name: response.data.name,
    symbol: response.data.symbol,
    image: response.data.iconUrl || '',
    aggregators: response.data.aggregators || [],
    occurrences: response.data.occurrences || 0,
  };
}

export async function fundAccount(
  rpcUrl: string,
  address: string,
  chainId: string,
  token: { address: string; symbol: string; decimals: number },
  amount: number = 100,
): Promise<void> {
  try {
    const amt = ethers.utils
      .parseUnits(amount.toString(), token.decimals)
      .toHexString();
    let amtHex = amt.replace(/^0x0+/, '0x');
    if (amtHex === '0x') {
      amtHex = '0x0';
    }
    await Tenderly.addFunds(rpcUrl, address, amtHex);
    console.log(
      `Fund account ${address} with ${amount} ${token.symbol} (${amtHex}) in chain ${chainId}`,
    );
  } catch (e) {
    throw new Error(
      'Failed to fund account for lending: ' +
        (e instanceof Error ? e.message : e),
    );
  }
}

export async function setTokenBalance(
  rpcUrl: string,
  address: string,
  chainId: string,
  token: { address: string; symbol: string; decimals: number },
  amount = 256,
): Promise<void> {
  try {
    const amt = ethers.utils
      .parseUnits(amount.toString(), token.decimals)
      .toHexString();
    let amtHex = amt.replace(/^0x0+/, '0x');
    if (amtHex === '0x') {
      amtHex = '0x0';
    }
    await Tenderly.setErc20Balance(rpcUrl, token.address, address, amtHex);
    console.log(
      `Add ${amount} ${token.symbol} (${amtHex}) to account ${address} in chain ${chainId}`,
    );
  } catch (e) {
    throw new Error(
      'Failed to fund account for lending: ' +
        (e instanceof Error ? e.message : e),
    );
  }
}

export async function selectImportedAccount(): Promise<void> {
  try {
    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
    await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(1);
  } catch (e) {
    throw new Error(
      'Failed to select imported account: ' +
        (e instanceof Error ? e.message : e),
    );
  }
}
