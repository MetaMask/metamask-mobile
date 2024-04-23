import { NameType } from '@metamask/name-controller';
import { useTokenListName } from './useTokenListName';
import { useTokenList } from './useTokenList';
import { TokenListMap } from '@metamask/assets-controllers';

jest.mock('react-redux', () => ({
  useSelector: (selector: any) => selector(),
}));

jest.mock('./useTokenList', () => ({
  useTokenList: jest.fn(),
}));

const TOKEN_NAME_MOCK = 'MetaMask Token';
const TOKEN_ADDRESS_MOCK = '0x0439e60F02a8900a951603950d8D4527f400C3f1';
const UNKNOWN_ADDRESS_MOCK = '0xabc123';

describe('useTokenListName', () => {
  const useTokenListMock = jest.mocked(useTokenList);
  beforeEach(() => {
    jest.resetAllMocks();

    useTokenListMock.mockReturnValue({
      [TOKEN_ADDRESS_MOCK.toLowerCase()]: { name: TOKEN_NAME_MOCK },
    } as TokenListMap);
  });

  it('returns null if no name found', () => {
    const name = useTokenListName(
      UNKNOWN_ADDRESS_MOCK,
      NameType.ETHEREUM_ADDRESS,
    );

    expect(name).toBe(null);
  });

  it('returns name if found', () => {
    const name = useTokenListName(
      TOKEN_ADDRESS_MOCK,
      NameType.ETHEREUM_ADDRESS,
    );
    expect(name).toBe(TOKEN_NAME_MOCK);
  });

  it('returns null if type is not address', () => {
    const alternateType = 'alternateType' as NameType;

    const name = useTokenListName(TOKEN_ADDRESS_MOCK, alternateType);

    expect(name).toBe(null);
  });

  it('normalizes addresses to lowercase', () => {
    const name = useTokenListName(
      TOKEN_ADDRESS_MOCK.toUpperCase(),
      NameType.ETHEREUM_ADDRESS,
    );

    expect(name).toBe(TOKEN_NAME_MOCK);
  });
});
