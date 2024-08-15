import { renderHook } from '@testing-library/react-hooks';
import useEnsNameByAddress from '.';

const MOCK_CHAIN_ID = '0x1';

const MOCK_ENS_CACHED_NAME = 'fox.eth';

const MOCK_ACCOUNT_ADDRESS = '0xABC123';

const MOCK_STORE_STATE = {
  engine: {
    backgroundState: {
      NetworkController: {
        providerConfig: {
          chainId: MOCK_CHAIN_ID,
        },
      },
    },
  },
};

jest.mock('../../../util/ENSUtils', () => ({
  ...jest.requireActual('../../../util/ENSUtils'),
  doENSReverseLookup: jest
    .fn()
    .mockImplementation((address: string, chainId: string) => {
      const cacheKey = `${chainId}${address}`;
      const MOCK_ENS_CACHE: { [key: string]: string } = {
        [`${MOCK_CHAIN_ID}${MOCK_ACCOUNT_ADDRESS}`]: MOCK_ENS_CACHED_NAME,
      };
      return MOCK_ENS_CACHE[cacheKey];
    }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (fn: (state: unknown) => unknown) => fn(MOCK_STORE_STATE),
}));

describe('useEnsNameByAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ENS name for account address', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useEnsNameByAddress(MOCK_ACCOUNT_ADDRESS),
    );
    await waitForNextUpdate();
    expect(result.current.ensName).toStrictEqual(MOCK_ENS_CACHED_NAME);
  });

  it('returns empty string for account address without ENS address', async () => {
    const { result } = renderHook(() => useEnsNameByAddress('0x321'));
    expect(result.current.ensName).toStrictEqual('');
  });
});
