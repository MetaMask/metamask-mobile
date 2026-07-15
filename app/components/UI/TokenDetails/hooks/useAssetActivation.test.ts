///: BEGIN:ONLY_INCLUDE_IF(stellar)
import { act, renderHook } from '@testing-library/react-hooks';
import { XlmScope } from '@metamask/keyring-api';
import { errorCodes } from '@metamask/rpc-errors';
import type { CaipAssetType } from '@metamask/utils';

import { getStellarTrustlineAssetInfoForAccount } from '../../../../selectors/stellar/stellar-assets';
import {
  requestStellarChangeTrustOptAdd,
  requestStellarChangeTrustOptDelete,
} from '../../../../util/stellar/stellar-snap-client-requests';
import { selectMultichainBalances } from '../../../../selectors/multichain';
import { useAssetActivation } from './useAssetActivation';

const ACCOUNT_ID = 'stellar-account-id';
const PUBNET_USDC_ASSET =
  'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' as CaipAssetType;
const SEP41_ASSET_ID =
  'stellar:pubnet/sep41:CBIJBDNZNF4X35BJ4FFZWCDBSCKOP5NB4PLG4SNENRMLAPYG4P5FM6VN' as CaipAssetType;

const DEFAULT_HOOK_PARAMS = {
  accountId: ACCOUNT_ID,
  assetId: PUBNET_USDC_ASSET,
  assetSymbol: 'USDC',
};

jest.mock('react-redux', () => ({
  useSelector: <State, Result>(selector: (state: State) => Result): Result =>
    selector({} as State),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: () => () => undefined,
}));

jest.mock('../../../../selectors/multichain', () => ({
  selectMultichainBalances: jest.fn(() => ({})),
}));

jest.mock('../../../../selectors/stellar/stellar-assets', () => ({
  getStellarTrustlineAssetInfoForAccount: jest.fn(),
}));

jest.mock('../../../../util/stellar/stellar-snap-client-requests', () => ({
  requestStellarChangeTrustOptAdd: jest.fn(),
  requestStellarChangeTrustOptDelete: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    if (key === 'asset_activation.deactivate_error_non_zero_balance_stellar') {
      return `You still have ${params?.balance} ${params?.symbol}`;
    }
    if (key === 'asset_activation.deactivate_error') {
      return 'deactivate error';
    }
    if (key === 'asset_activation.activate_error') {
      return 'activate error';
    }
    return key;
  },
}));

describe('useAssetActivation', () => {
  const getStellarTrustlineAssetInfoForAccountMock = jest.mocked(
    getStellarTrustlineAssetInfoForAccount,
  );
  const requestAddMock = jest.mocked(requestStellarChangeTrustOptAdd);
  const requestDeleteMock = jest.mocked(requestStellarChangeTrustOptDelete);
  const selectMultichainBalancesMock = jest.mocked(selectMultichainBalances);

  beforeEach(() => {
    jest.clearAllMocks();
    selectMultichainBalancesMock.mockReturnValue({});
    getStellarTrustlineAssetInfoForAccountMock.mockReturnValue({
      limit: '10',
    });
    requestAddMock.mockResolvedValue({ status: true });
    requestDeleteMock.mockResolvedValue(undefined);
  });

  describe('canDeactivate / requiresActivate', () => {
    it('returns false canDeactivate for non-trustline assets', () => {
      const { result } = renderHook(() =>
        useAssetActivation({
          accountId: ACCOUNT_ID,
          assetId: SEP41_ASSET_ID,
          assetSymbol: 'SEP41',
        }),
      );

      expect(result.current.canDeactivate).toBe(false);
      expect(result.current.requiresActivate).toBe(false);
    });

    it('returns false canDeactivate when trustline limit is zero', () => {
      getStellarTrustlineAssetInfoForAccountMock.mockReturnValue({
        limit: '0',
      });

      const { result } = renderHook(() =>
        useAssetActivation(DEFAULT_HOOK_PARAMS),
      );

      expect(result.current.requiresActivate).toBe(true);
      expect(result.current.canDeactivate).toBe(false);
    });

    it('returns true canDeactivate when trustline limit is greater than zero', () => {
      const { result } = renderHook(() =>
        useAssetActivation(DEFAULT_HOOK_PARAMS),
      );

      expect(result.current.requiresActivate).toBe(false);
      expect(result.current.canDeactivate).toBe(true);
    });
  });

  describe('activateAsset', () => {
    it('requests trustline add on success', async () => {
      const { result } = renderHook(() =>
        useAssetActivation(DEFAULT_HOOK_PARAMS),
      );

      let actionResult;
      await act(async () => {
        actionResult = await result.current.activateAsset();
      });

      expect(requestAddMock).toHaveBeenCalledWith({
        accountId: ACCOUNT_ID,
        assetId: PUBNET_USDC_ASSET,
        scope: XlmScope.Pubnet,
      });
      expect(result.current.isActivating).toBe(false);
      expect(actionResult).toEqual({ success: true, errorMessage: null });
    });

    it('does not request add for non-trustline assets', async () => {
      const { result } = renderHook(() =>
        useAssetActivation({
          accountId: ACCOUNT_ID,
          assetId: SEP41_ASSET_ID,
          assetSymbol: 'SEP41',
        }),
      );

      let actionResult;
      await act(async () => {
        actionResult = await result.current.activateAsset();
      });

      expect(requestAddMock).not.toHaveBeenCalled();
      expect(actionResult).toEqual({ success: false, errorMessage: null });
    });

    it('returns an error message when activation fails', async () => {
      requestAddMock.mockRejectedValue(new Error('activation failed'));

      const { result } = renderHook(() =>
        useAssetActivation(DEFAULT_HOOK_PARAMS),
      );

      let actionResult;
      await act(async () => {
        actionResult = await result.current.activateAsset();
      });

      expect(actionResult).toEqual({
        success: false,
        errorMessage: 'activate error',
      });
    });

    it('returns cancelled result when the user rejects activation', async () => {
      requestAddMock.mockRejectedValue({
        code: errorCodes.provider.userRejectedRequest,
      });

      const { result } = renderHook(() =>
        useAssetActivation(DEFAULT_HOOK_PARAMS),
      );

      let actionResult;
      await act(async () => {
        actionResult = await result.current.activateAsset();
      });

      expect(actionResult).toEqual({ success: false, errorMessage: null });
    });

    it('returns cancelled result when funding prompt is shown', async () => {
      requestAddMock.mockResolvedValue({ status: false });

      const { result } = renderHook(() =>
        useAssetActivation(DEFAULT_HOOK_PARAMS),
      );

      let actionResult;
      await act(async () => {
        actionResult = await result.current.activateAsset();
      });

      expect(actionResult).toEqual({ success: false, errorMessage: null });
    });
  });

  describe('deactivateAsset', () => {
    it('requests trustline delete on success', async () => {
      const { result } = renderHook(() =>
        useAssetActivation(DEFAULT_HOOK_PARAMS),
      );

      let actionResult;
      await act(async () => {
        actionResult = await result.current.deactivateAsset();
      });

      expect(requestDeleteMock).toHaveBeenCalledWith({
        accountId: ACCOUNT_ID,
        assetId: PUBNET_USDC_ASSET,
        scope: XlmScope.Pubnet,
      });
      expect(result.current.isDeactivating).toBe(false);
      expect(actionResult).toEqual({ success: true, errorMessage: null });
    });

    it('does nothing when deactivation is not allowed', async () => {
      getStellarTrustlineAssetInfoForAccountMock.mockReturnValue({
        limit: '0',
      });

      const { result } = renderHook(() =>
        useAssetActivation(DEFAULT_HOOK_PARAMS),
      );

      let actionResult;
      await act(async () => {
        actionResult = await result.current.deactivateAsset();
      });

      expect(requestDeleteMock).not.toHaveBeenCalled();
      expect(actionResult).toEqual({ success: false, errorMessage: null });
    });

    it('returns a generic remove error when deactivation fails', async () => {
      requestDeleteMock.mockRejectedValue(new Error('deactivation failed'));

      const { result } = renderHook(() =>
        useAssetActivation(DEFAULT_HOOK_PARAMS),
      );

      let actionResult;
      await act(async () => {
        actionResult = await result.current.deactivateAsset();
      });

      expect(actionResult).toEqual({
        success: false,
        errorMessage: 'deactivate error',
      });
    });

    it('returns non-zero balance error without requesting delete', async () => {
      selectMultichainBalancesMock.mockReturnValue({
        [ACCOUNT_ID]: {
          [PUBNET_USDC_ASSET]: { amount: '5.5' },
        },
      });

      const { result } = renderHook(() =>
        useAssetActivation(DEFAULT_HOOK_PARAMS),
      );

      let actionResult;
      await act(async () => {
        actionResult = await result.current.deactivateAsset();
      });

      expect(requestDeleteMock).not.toHaveBeenCalled();
      expect(actionResult).toEqual({
        success: false,
        errorMessage: 'You still have 5.5 USDC',
      });
    });

    it('returns cancelled result when the user rejects deactivation', async () => {
      requestDeleteMock.mockRejectedValue({
        code: errorCodes.provider.userRejectedRequest,
      });

      const { result } = renderHook(() =>
        useAssetActivation(DEFAULT_HOOK_PARAMS),
      );

      let actionResult;
      await act(async () => {
        actionResult = await result.current.deactivateAsset();
      });

      expect(actionResult).toEqual({ success: false, errorMessage: null });
    });
  });
});
///: END:ONLY_INCLUDE_IF
