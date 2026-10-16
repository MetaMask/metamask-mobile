import { renderHook } from '@testing-library/react-native';
import type { CaipAssetType } from '@metamask/utils';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useTokenCaipAssetId } from './useTokenCaipAssetId';

type TokenArg = Pick<
  TokenDetailsRouteParams,
  'caipAssetId' | 'address' | 'chainId'
>;

const renderWithToken = (token: TokenArg) =>
  renderHook(() => useTokenCaipAssetId(token));

describe('useTokenCaipAssetId', () => {
  it('prefers the caipAssetId supplied at navigation time', () => {
    const { result } = renderWithToken({
      caipAssetId: 'eip155:1/erc20:0xAbC' as CaipAssetType,
      address: '0xdef',
      chainId: '0x1',
    });

    expect(result.current).toBe('eip155:1/erc20:0xAbC');
  });

  it('uses the address when it is already a CAIP-19 asset id', () => {
    const { result } = renderWithToken({
      address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:abc',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    });

    expect(result.current).toBe(
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:abc',
    );
  });

  it('derives an asset id from an EVM address and chain id', () => {
    const { result } = renderWithToken({
      address: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
      chainId: '0x1',
    });

    expect(result.current).toBe(
      'eip155:1/erc20:0x6982508145454Ce325dDbE47a25d4ec3d2311933',
    );
  });

  it('falls back to the native currency id for non-EVM native tokens', () => {
    const { result } = renderWithToken({
      address: 'native',
      chainId: 'bip122:000000000019d6689c085ae165831e93',
    });

    expect(result.current).toBe(
      'bip122:000000000019d6689c085ae165831e93/slip44:0',
    );
  });

  it('returns null when there is no chain id to derive from', () => {
    const { result } = renderWithToken({
      address: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
      chainId: undefined,
    });

    expect(result.current).toBeNull();
  });

  it('returns a stable reference while the token fields are unchanged', () => {
    const { result, rerender } = renderWithToken({
      caipAssetId: 'eip155:1/erc20:0xAbC' as CaipAssetType,
      address: '0xdef',
      chainId: '0x1',
    });
    const first = result.current;

    rerender({});

    expect(result.current).toBe(first);
  });
});
