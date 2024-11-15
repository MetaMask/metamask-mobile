import { TokenListToken } from '@metamask/assets-controllers';
import { NameType } from '../../UI/Name/Name.types';
import { useTokenListEntry } from './useTokenListEntry';
import useTokenList from './useTokenList';

jest.mock('./useTokenList', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const TOKEN_NAME_MOCK = 'Test Token';
const TOKEN_ADDRESS_MOCK = '0x0439e60F02a8900a951603950d8D4527f400C3f1';
const TOKEN_SYMBOL_MOCK = 'MMT';
const UNKNOWN_ADDRESS_MOCK = '0xabc123';

describe('useTokenListEntry', () => {
  const useTokenListMock = jest.mocked(useTokenList);
  beforeEach(() => {
    jest.resetAllMocks();

    useTokenListMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_MOCK.toLowerCase(),
        name: TOKEN_NAME_MOCK,
        symbol: TOKEN_SYMBOL_MOCK,
      },
    ] as unknown as TokenListToken[]);
  });

  it('returns undefined if no token found', () => {
    const name = useTokenListEntry(
      UNKNOWN_ADDRESS_MOCK,
      NameType.EthereumAddress,
    );

    expect(name).toBe(undefined);
  });

  it('returns name if found', () => {
    const token = useTokenListEntry(
      TOKEN_ADDRESS_MOCK,
      NameType.EthereumAddress,
    );
    expect(token?.name).toBe(TOKEN_NAME_MOCK);
    expect(token?.symbol).toBe(TOKEN_SYMBOL_MOCK);
  });

  it('returns null if type is not address', () => {
    const alternateType = 'alternateType' as NameType;

    const token = useTokenListEntry(TOKEN_ADDRESS_MOCK, alternateType);

    expect(token).toBe(null);
  });

  it('normalizes addresses to lowercase', () => {
    const token = useTokenListEntry(
      TOKEN_ADDRESS_MOCK.toUpperCase(),
      NameType.EthereumAddress,
    );

    expect(token?.name).toBe(TOKEN_NAME_MOCK);
  });
});
