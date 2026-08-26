import { CaipChainId } from '@metamask/utils';
import { ensureCardFundingTokensImported } from './ensureCardFundingTokensImported';
import { FundingStatus, type CardFundingToken } from '../types';
import Engine from '../../../../core/Engine';
import { store } from '../../../../store';
import { getTokensControllerAllTokens } from '../../../../selectors/assets/assets-migration';

jest.mock('../../../../util/Logger');
jest.mock('../../../../store', () => ({
  store: { getState: jest.fn(() => ({})) },
}));
jest.mock('../../../../selectors/assets/assets-migration', () => ({
  getTokensControllerAllTokens: jest.fn(() => ({})),
}));
jest.mock('../../../../core/Engine', () => ({
  context: {
    TokensController: {
      addToken: jest.fn(() => Promise.resolve()),
    },
  },
}));

const mockGetAllTokens = getTokensControllerAllTokens as jest.MockedFunction<
  typeof getTokensControllerAllTokens
>;
const mockAddToken = Engine.context.TokensController.addToken as jest.Mock;
const mockEnsureNetworkExists = jest.fn<Promise<string>, [string]>();

const baseSepoliaToken: CardFundingToken = {
  address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  caipChainId: 'eip155:84532' as CaipChainId,
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
  fundingStatus: FundingStatus.Enabled,
  spendableBalance: '',
  walletAddress: '0xabc',
};

describe('ensureCardFundingTokensImported', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllTokens.mockReturnValue({} as never);
    mockAddToken.mockResolvedValue(undefined);
    mockEnsureNetworkExists.mockResolvedValue('base-sepolia-client');
  });

  it('adds+enables the network then imports the untracked EVM funding token', async () => {
    await ensureCardFundingTokensImported(
      [baseSepoliaToken],
      mockEnsureNetworkExists,
    );

    expect(mockEnsureNetworkExists).toHaveBeenCalledWith('eip155:84532');
    expect(mockAddToken).toHaveBeenCalledWith({
      address: baseSepoliaToken.address,
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC',
      networkClientId: 'base-sepolia-client',
    });
  });

  it('skips a token already tracked in TokensController', async () => {
    mockGetAllTokens.mockReturnValue({
      '0x14a34': {
        '0xabc': [{ address: baseSepoliaToken.address }],
      },
    } as never);

    await ensureCardFundingTokensImported(
      [baseSepoliaToken],
      mockEnsureNetworkExists,
    );

    expect(mockEnsureNetworkExists).not.toHaveBeenCalled();
    expect(mockAddToken).not.toHaveBeenCalled();
  });

  it('does not import when the network cannot be configured', async () => {
    mockEnsureNetworkExists.mockRejectedValue(new Error('network not found'));

    await ensureCardFundingTokensImported(
      [baseSepoliaToken],
      mockEnsureNetworkExists,
    );

    expect(mockAddToken).not.toHaveBeenCalled();
  });

  it('skips non-EVM (Solana) and incomplete tokens', async () => {
    const solanaToken: CardFundingToken = {
      ...baseSepoliaToken,
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      caipChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
    };

    await ensureCardFundingTokensImported(
      [solanaToken, { ...baseSepoliaToken, address: null }, null, undefined],
      mockEnsureNetworkExists,
    );

    expect(mockEnsureNetworkExists).not.toHaveBeenCalled();
    expect(mockAddToken).not.toHaveBeenCalled();
  });

  it('deduplicates repeated tokens so addToken runs once', async () => {
    await ensureCardFundingTokensImported(
      [baseSepoliaToken, baseSepoliaToken],
      mockEnsureNetworkExists,
    );

    expect(mockAddToken).toHaveBeenCalledTimes(1);
  });
});
