import {
  LendingMarketWithPosition,
  LendingPositionWithMarketReference,
} from '@metamask/earn-controller';
import { LendingProtocol } from '../../Earn/types/lending.types';

export const MOCK_POOLED_STAKES_DATA = {
  account: '0x1234',
  lifetimeRewards: '100',
  assets: '1000',
  exitRequests: [],
};

export const MOCK_VAULT_DATA = {
  apy: '3.3',
  capacity: '1000000',
  feePercent: 10,
  totalAssets: '500000',
  vaultAddress: '0xabcd',
};

export const MOCK_LENDING_MARKET_USDT: LendingMarketWithPosition = {
  id: '1',
  chainId: 1,
  position: {
    marketId: '1',
    marketAddress: '0x91a9948b5002846b9fa5200a58291d46c30d6fe1',
    protocol: LendingProtocol.AAVE,
    id: '123',
    chainId: 1,
    assets: '300',
  },
  protocol: LendingProtocol.AAVE,
  netSupplyRate: 1.534534563463546,
  totalSupplyRate: 1.534534563463546,
  name: 'Market 1',
  address: '0x91a9948b5002846b9fa5200a58291d46c30d6fe1',
  tvlUnderlying: '100',
  underlying: {
    address: '0x91a9148b5002846b9fa5200a58291d46c30d6fe1',
    chainId: 1,
  },
  outputToken: {
    address: '0x91a9948b5002846b9fa5200a58291d46c30d6fe1',
    chainId: 1,
  },
  rewards: [],
};

export const MOCK_LENDING_MARKET_USDC: LendingMarketWithPosition = {
  id: '2',
  chainId: 1,
  position: {
    marketId: '2',
    marketAddress: '0x541228169929efac864aa7668a02320a3691b0fc',
    protocol: LendingProtocol.AAVE,
    id: '1233',
    chainId: 1,
    assets: '100',
  },
  protocol: LendingProtocol.AAVE,
  netSupplyRate: 1.534534563463546,
  totalSupplyRate: 1.534534563463546,
  name: 'Market 1',
  address: '0x541228169929efac864aa7668a02320a3691b0fc',
  tvlUnderlying: '100',
  underlying: {
    address: '0x551228169929efac864aa7668a02320a3691b0fc',
    chainId: 1,
  },
  outputToken: {
    address: '0x541228169929efac864aa7668a02320a3691b0fc',
    chainId: 1,
  },
  rewards: [],
};

export const MOCK_LENDING_MARKET_WETH: LendingMarketWithPosition = {
  id: '3',
  chainId: 1,
  position: {
    marketId: '3',
    marketAddress: '0xd73d7042f67d2081bf3e709934c48433542ebe4a',
    protocol: LendingProtocol.AAVE,
    id: '123',
    chainId: 1,
    assets: '200',
  },
  protocol: LendingProtocol.AAVE,
  netSupplyRate: 1.534534563463546,
  totalSupplyRate: 1.534534563463546,
  name: 'Market 1',
  address: '0xd73d7042f67d2081bf3e709934c48433542ebe4a',
  tvlUnderlying: '1002364728356270365207637520568024756278',
  underlying: {
    address: '0xd83d7042f67d2081bf3e709934c48433542ebe4a',
    chainId: 1,
  },
  outputToken: {
    address: '0xd73d7042f67d2081bf3e709934c48433542ebe4a',
    chainId: 1,
  },
  rewards: [],
};

export const MOCK_LENDING_MARKETS: LendingMarketWithPosition[] = [
  MOCK_LENDING_MARKET_USDT,
  MOCK_LENDING_MARKET_USDC,
  MOCK_LENDING_MARKET_WETH,
];

export const MOCK_LENDING_POSITION_USDT: LendingPositionWithMarketReference = {
  marketId: MOCK_LENDING_MARKET_USDT.id,
  marketAddress: MOCK_LENDING_MARKET_USDT.address,
  protocol: LendingProtocol.AAVE,
  id: '645',
  chainId: 1,
  assets: '300',
};

export const MOCK_LENDING_POSITION_USDC: LendingPositionWithMarketReference = {
  marketId: MOCK_LENDING_MARKET_USDC.id,
  marketAddress: MOCK_LENDING_MARKET_USDC.address,
  protocol: LendingProtocol.AAVE,
  id: '432',
  chainId: 1,
  assets: '100',
};

export const MOCK_LENDING_POSITION_WETH: LendingPositionWithMarketReference = {
  marketId: MOCK_LENDING_MARKET_WETH.id,
  marketAddress: MOCK_LENDING_MARKET_WETH.address,
  protocol: LendingProtocol.AAVE,
  id: '321',
  chainId: 1,
  assets: '200',
};

export const MOCK_LENDING_POSITIONS: LendingPositionWithMarketReference[] = [
  MOCK_LENDING_POSITION_USDT,
  MOCK_LENDING_POSITION_USDC,
  MOCK_LENDING_POSITION_WETH,
];

export const MOCK_EXCHANGE_RATE = '1.5';
