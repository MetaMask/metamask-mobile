import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NameType } from '../../UI/Name/Name.types';
import { useERC20Tokens } from './useERC20Tokens';
import { renderHookWithProvider } from '../../../util/test/renderWithProvider';

const TOKEN_NAME_MOCK = 'Test Token';
const TOKEN_SYMBOL_MOCK = 'TT';
const TOKEN_ICON_URL_MOCK = 'https://example.com/icon.png';
const TOKEN_ADDRESS_MOCK = '0x0439e60f02a8900a951603950d8d4527f400c3f1';
const CHAIN_ID_MOCK = CHAIN_IDS.MAINNET;
const ASSET_ID_MOCK = `eip155:1/erc20:${TOKEN_ADDRESS_MOCK}`;

jest.mock('../useTokensData/useTokensData', () => ({
  useTokensData: jest.fn(),
}));

import { useTokensData } from '../useTokensData/useTokensData';

const mockUseTokensData = useTokensData as jest.Mock;

function renderHook(requests: Parameters<typeof useERC20Tokens>[0]) {
  return renderHookWithProvider(() => useERC20Tokens(requests), { state: {} });
}

describe('useERC20Tokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTokensData.mockReturnValue({
      [ASSET_ID_MOCK]: {
        assetId: ASSET_ID_MOCK,
        name: TOKEN_NAME_MOCK,
        symbol: TOKEN_SYMBOL_MOCK,
        iconUrl: TOKEN_ICON_URL_MOCK,
      },
    });
  });

  it('returns undefined if type is not EthereumAddress', () => {
    const { result } = renderHook([
      {
        type: 'alternateType' as NameType,
        value: TOKEN_ADDRESS_MOCK,
        variation: CHAIN_ID_MOCK,
      },
    ]);

    expect(result.current[0]).toBeUndefined();
  });

  it('returns name when token is found', () => {
    const { result } = renderHook([
      {
        type: NameType.EthereumAddress,
        value: TOKEN_ADDRESS_MOCK,
        variation: CHAIN_ID_MOCK,
      },
    ]);

    expect(result.current[0]?.name).toBe(TOKEN_NAME_MOCK);
  });

  it('returns symbol when preferContractSymbol is true', () => {
    const { result } = renderHook([
      {
        preferContractSymbol: true,
        type: NameType.EthereumAddress,
        value: TOKEN_ADDRESS_MOCK,
        variation: CHAIN_ID_MOCK,
      },
    ]);

    expect(result.current[0]?.name).toBe(TOKEN_SYMBOL_MOCK);
  });

  it('returns image when token is found', () => {
    const { result } = renderHook([
      {
        type: NameType.EthereumAddress,
        value: TOKEN_ADDRESS_MOCK,
        variation: CHAIN_ID_MOCK,
      },
    ]);

    expect(result.current[0]?.image).toBe(TOKEN_ICON_URL_MOCK);
  });

  it('returns name and image as undefined when token is not found', () => {
    mockUseTokensData.mockReturnValue({});

    const { result } = renderHook([
      {
        type: NameType.EthereumAddress,
        value: TOKEN_ADDRESS_MOCK,
        variation: CHAIN_ID_MOCK,
      },
    ]);

    expect(result.current[0]).toEqual({ name: undefined, image: undefined });
  });

  it('normalizes addresses to lowercase when building the asset ID', () => {
    const { result } = renderHook([
      {
        type: NameType.EthereumAddress,
        value: TOKEN_ADDRESS_MOCK.toUpperCase(),
        variation: CHAIN_ID_MOCK,
      },
    ]);

    expect(result.current[0]?.name).toBe(TOKEN_NAME_MOCK);
  });
});
