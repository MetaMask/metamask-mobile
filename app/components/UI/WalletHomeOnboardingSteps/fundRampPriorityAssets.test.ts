import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  createMainnetEthBuyabilityToken,
  createMainnetMusdBuyabilityToken,
  MAINNET_ETH_RAMP_ASSET_ID,
  MAINNET_MUSD_RAMP_ASSET_ID,
  MAINNET_MUSD_TOKEN_ADDRESS,
  WALLET_HOME_ONBOARDING_FUND_RAMP_PRIORITY,
} from './fundRampPriorityAssets';
import { getTokenBuyabilityKey } from '../Ramp/hooks/useTokenBuyability';

describe('fundRampPriorityAssets', () => {
  it('defines mainnet mUSD and ETH asset ids', () => {
    expect(MAINNET_MUSD_RAMP_ASSET_ID).toBe(
      'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
    );
    expect(MAINNET_ETH_RAMP_ASSET_ID).toBe('eip155:1/slip44:60');
  });

  it('orders mUSD before ETH in the priority list', () => {
    expect(
      WALLET_HOME_ONBOARDING_FUND_RAMP_PRIORITY.map((c) => c.assetId),
    ).toEqual([MAINNET_MUSD_RAMP_ASSET_ID, MAINNET_ETH_RAMP_ASSET_ID]);
  });

  it('builds distinct buyability token keys for mUSD and ETH', () => {
    const musdKey = getTokenBuyabilityKey(createMainnetMusdBuyabilityToken());
    const ethKey = getTokenBuyabilityKey(createMainnetEthBuyabilityToken());

    expect(musdKey).not.toBe(ethKey);
    expect(musdKey).toContain('eip155:1');
    expect(ethKey).toContain('eip155:1');
  });

  it('uses mainnet hex chain id and erc20 address for mUSD buyability stub', () => {
    const musdToken = createMainnetMusdBuyabilityToken();

    expect(musdToken.chainId).toBe(CHAIN_IDS.MAINNET);
    expect(musdToken.isNative).toBe(false);
    expect(musdToken.address).toBe(MAINNET_MUSD_TOKEN_ADDRESS);
  });

  it('marks ETH buyability stub as native on mainnet', () => {
    const ethToken = createMainnetEthBuyabilityToken();

    expect(ethToken.chainId).toBe(CHAIN_IDS.MAINNET);
    expect(ethToken.isNative).toBe(true);
  });
});
