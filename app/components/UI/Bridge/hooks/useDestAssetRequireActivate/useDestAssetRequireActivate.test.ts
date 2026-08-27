import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { isCrossChain } from '@metamask/bridge-controller';
import { XlmScope } from '@metamask/keyring-api';
import { getIsAssetRequireActivate } from '../../../../../selectors/stellar/stellar-assets';
import { getMemoizedInternalAccountByAddress } from '../../../../../selectors/accountsController';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { createBridgeTestState, createMockToken } from '../../testUtils';
import { useDestAssetRequireActivate } from '.';

jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  isCrossChain: jest.fn(),
}));

jest.mock('../../../../../selectors/stellar/stellar-assets', () => ({
  ...jest.requireActual('../../../../../selectors/stellar/stellar-assets'),
  getIsAssetRequireActivate: jest.fn(),
}));

jest.mock('../../../../../selectors/accountsController', () => ({
  ...jest.requireActual('../../../../../selectors/accountsController'),
  getMemoizedInternalAccountByAddress: jest.fn(),
}));

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual('../../../../../selectors/multichainAccounts/accounts'),
  selectSelectedInternalAccountByScope: jest.fn(),
}));

const STELLAR_USDC =
  'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

const DEST_ACCOUNT = {
  id: 'stellar-dest-id',
  address: 'GADESTACCOUNT0000000000000000000000000000000000000000000',
};

const ACTIVE_ACCOUNT = {
  id: 'stellar-active-id',
  address: 'GAACTIVEACCOUNT00000000000000000000000000000000000000000',
};

describe('useDestAssetRequireActivate', () => {
  const mockSelectedByScope = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isCrossChain).mockReturnValue(true);
    jest.mocked(getIsAssetRequireActivate).mockReturnValue(true);
    jest
      .mocked(getMemoizedInternalAccountByAddress)
      .mockReturnValue(DEST_ACCOUNT as never);
    mockSelectedByScope.mockReturnValue(DEST_ACCOUNT);
    jest
      .mocked(selectSelectedInternalAccountByScope)
      .mockReturnValue(mockSelectedByScope);
  });

  const render = (overrides?: {
    destAddress?: string | null;
    sourceToken?: ReturnType<typeof createMockToken>;
    destToken?: ReturnType<typeof createMockToken>;
  }) => {
    const state = createBridgeTestState({
      bridgeReducerOverrides: {
        sourceToken:
          overrides?.sourceToken ??
          createMockToken({
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'ETH',
            chainId: '0x1',
          }),
        destToken:
          overrides?.destToken ??
          createMockToken({
            address: STELLAR_USDC,
            symbol: 'USDC',
            chainId: XlmScope.Pubnet,
          }),
        destAddress:
          overrides && 'destAddress' in overrides
            ? (overrides.destAddress ?? undefined)
            : DEST_ACCOUNT.address,
      },
    });

    return renderHookWithProvider(() => useDestAssetRequireActivate(), {
      state,
    });
  };

  it('returns true when cross-chain dest requires activation on the dest account', () => {
    const { result } = render();

    expect(result.current.isDestAssetRequireActivate).toBe(true);
    expect(result.current.isDestSameAsActiveAccount).toBe(true);
    expect(getIsAssetRequireActivate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        assetId: STELLAR_USDC,
        accountId: DEST_ACCOUNT.id,
      }),
    );
  });

  it('returns isDestSameAsActiveAccount false when dest differs from active dest-chain account', () => {
    mockSelectedByScope.mockReturnValue(ACTIVE_ACCOUNT);

    const { result } = render();

    expect(result.current.isDestAssetRequireActivate).toBe(true);
    expect(result.current.isDestSameAsActiveAccount).toBe(false);
  });

  it('returns false when destAddress has no matching internal account', () => {
    jest.mocked(getMemoizedInternalAccountByAddress).mockReturnValue(undefined);

    const { result } = render({ destAddress: 'GEXTERNAL' });

    expect(result.current.isDestAssetRequireActivate).toBe(false);
    expect(getIsAssetRequireActivate).not.toHaveBeenCalled();
  });

  it('returns false for same-chain swaps', () => {
    jest.mocked(isCrossChain).mockReturnValue(false);

    const { result } = render();

    expect(result.current.isDestAssetRequireActivate).toBe(false);
  });

  it('returns false when destAddress is missing', () => {
    const { result } = render({ destAddress: null });

    expect(result.current.isDestAssetRequireActivate).toBe(false);
  });
});
