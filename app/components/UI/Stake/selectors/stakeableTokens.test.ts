import { selectIsStakeableToken } from './stakeableTokens';
import { selectTrxStakingEnabled } from '../../../../selectors/featureFlagController/trxStakingEnabled';
import { TokenI } from '../../Tokens/types';

jest.mock(
  '../../../../selectors/featureFlagController/trxStakingEnabled',
  () => ({
    selectTrxStakingEnabled: jest.fn(),
  }),
);

describe('selectIsStakeableToken', () => {
  const mockState = {} as unknown as import('../../../../reducers').RootState;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when asset is null', () => {
    (jest.mocked(selectTrxStakingEnabled) as jest.Mock).mockReturnValue(false);

    const result = selectIsStakeableToken(mockState, null as unknown as TokenI);

    expect(result).toBe(false);
  });

  it('returns true for ETH native assets', () => {
    (jest.mocked(selectTrxStakingEnabled) as jest.Mock).mockReturnValue(false);
    const ethAsset = { isETH: true } as TokenI;

    const result = selectIsStakeableToken(mockState, ethAsset);

    expect(result).toBe(true);
  });

  it('returns true for TRX native when TRX staking flag is enabled', () => {
    (jest.mocked(selectTrxStakingEnabled) as jest.Mock).mockReturnValue(true);
    const tronTrx = { ticker: 'TRX', chainId: 'tron:728126428' } as TokenI;

    const result = selectIsStakeableToken(mockState, tronTrx);

    expect(result).toBe(true);
  });

  it('returns false for TRX native when TRX staking flag is disabled', () => {
    (jest.mocked(selectTrxStakingEnabled) as jest.Mock).mockReturnValue(false);
    const tronTrx = { ticker: 'TRX', chainId: 'tron:728126428' } as TokenI;

    const result = selectIsStakeableToken(mockState, tronTrx);

    expect(result).toBe(false);
  });

  it('returns false for TRX on non-TRON chain', () => {
    (jest.mocked(selectTrxStakingEnabled) as jest.Mock).mockReturnValue(true);
    const nonTronTrx = { ticker: 'TRX', chainId: '0x1' } as TokenI;

    const result = selectIsStakeableToken(mockState, nonTronTrx);

    expect(result).toBe(false);
  });
});
