import { renderHook } from '@testing-library/react-hooks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useMusdRampAvailability } from './useMusdRampAvailability';
import {
  MUSD_BUYABLE_CHAIN_IDS,
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../constants/musd';
import {
  getTokenBuyabilityKey,
  useTokensBuyability,
} from '../../Ramp/hooks/useTokenBuyability';
import { TokenI } from '../../Tokens/types';

jest.mock('../../Ramp/hooks/useTokenBuyability', () => {
  const actual = jest.requireActual('../../Ramp/hooks/useTokenBuyability');
  return {
    ...actual,
    useTokensBuyability: jest.fn(),
  };
});

const mockUseTokensBuyability = useTokensBuyability as jest.MockedFunction<
  typeof useTokensBuyability
>;

describe('useMusdRampAvailability', () => {
  const getMusdToken = (chainId: Hex): TokenI => ({
    address: MUSD_TOKEN_ADDRESS_BY_CHAIN[chainId],
    chainId,
    symbol: MUSD_TOKEN.symbol,
    name: MUSD_TOKEN.name,
    decimals: MUSD_TOKEN.decimals,
    image: '',
    logo: undefined,
    balance: '0',
    isETH: false,
    isNative: false,
  });

  const MAINNET_MUSD_KEY = getTokenBuyabilityKey(
    getMusdToken(CHAIN_IDS.MAINNET as Hex),
  );
  const LINEA_MUSD_KEY = getTokenBuyabilityKey(
    getMusdToken(CHAIN_IDS.LINEA_MAINNET as Hex),
  );

  const setBuyability = (
    buyabilityByTokenKey: Record<string, boolean> = {},
  ) => {
    mockUseTokensBuyability.mockReturnValue({
      buyabilityByTokenKey,
      isLoading: false,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setBuyability({
      [MAINNET_MUSD_KEY]: true,
      [LINEA_MUSD_KEY]: true,
    });
  });

  it('returns false for all mUSD buyable chains when no tokens are buyable', () => {
    setBuyability({});

    const { result } = renderHook(() => useMusdRampAvailability());

    MUSD_BUYABLE_CHAIN_IDS.forEach((chainId) => {
      expect(result.current.isMusdBuyableOnChain[chainId]).toBe(false);
    });
    expect(result.current.isMusdBuyableOnAnyChain).toBe(false);
  });

  it('marks remaining chains as not buyable when buyability results are missing', () => {
    setBuyability({ [MAINNET_MUSD_KEY]: true });

    const { result } = renderHook(() => useMusdRampAvailability());

    expect(result.current.isMusdBuyableOnChain[CHAIN_IDS.MAINNET]).toBe(true);
    expect(result.current.isMusdBuyableOnChain[CHAIN_IDS.LINEA_MAINNET]).toBe(
      false,
    );
  });

  it('returns true when at least one chain has buyable mUSD', () => {
    setBuyability({
      [MAINNET_MUSD_KEY]: false,
      [LINEA_MUSD_KEY]: true,
    });

    const { result } = renderHook(() => useMusdRampAvailability());

    expect(result.current.isMusdBuyableOnAnyChain).toBe(true);
  });

  it('returns chain-specific buyability when a single chain is selected', () => {
    setBuyability({
      [MAINNET_MUSD_KEY]: true,
      [LINEA_MUSD_KEY]: false,
    });

    const { result } = renderHook(() => useMusdRampAvailability());

    const isMusdBuyable = result.current.getIsMusdBuyable(
      CHAIN_IDS.MAINNET as Hex,
      false,
    );

    expect(isMusdBuyable).toBe(true);
  });

  it('returns false when selected chain is not buyable', () => {
    setBuyability({
      [MAINNET_MUSD_KEY]: true,
      [LINEA_MUSD_KEY]: false,
    });

    const { result } = renderHook(() => useMusdRampAvailability());

    const isMusdBuyable = result.current.getIsMusdBuyable(
      CHAIN_IDS.LINEA_MAINNET as Hex,
      false,
    );

    expect(isMusdBuyable).toBe(false);
  });

  it('returns false when no chain is selected and popular networks filter is inactive', () => {
    setBuyability({
      [MAINNET_MUSD_KEY]: true,
      [LINEA_MUSD_KEY]: true,
    });

    const { result } = renderHook(() => useMusdRampAvailability());

    const isMusdBuyable = result.current.getIsMusdBuyable(null, false);

    expect(isMusdBuyable).toBe(false);
  });

  it('returns false for an unknown chain ID', () => {
    setBuyability({
      [MAINNET_MUSD_KEY]: true,
      [LINEA_MUSD_KEY]: true,
    });

    const { result } = renderHook(() => useMusdRampAvailability());

    const isMusdBuyable = result.current.getIsMusdBuyable(
      '0x999' as Hex,
      false,
    );

    expect(isMusdBuyable).toBe(false);
  });

  it('uses aggregate buyability when popular networks filter is active even with selected chain', () => {
    setBuyability({
      [MAINNET_MUSD_KEY]: false,
      [LINEA_MUSD_KEY]: true,
    });

    const { result } = renderHook(() => useMusdRampAvailability());

    const isMusdBuyable = result.current.getIsMusdBuyable(
      CHAIN_IDS.MAINNET as Hex,
      true,
    );

    expect(isMusdBuyable).toBe(true);
  });
});
