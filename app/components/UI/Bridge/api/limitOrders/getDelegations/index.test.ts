import type { Caip19AssetId } from '@metamask/assets-controller';
import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { useFetchLimitOrdersDelegations } from '.';

const mockGetBearerToken = jest.fn();
jest.mock('../../../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getBearerToken: () => mockGetBearerToken(),
    },
  },
}));

const MOCK_ACCOUNT = { id: 'mock-account-id' };
const mockGetSelectedAccountByScope = jest.fn();
jest.mock('../../../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: () => mockGetSelectedAccountByScope,
}));

const mockGetFormattedAddressFromInternalAccount = jest.fn();
jest.mock('../../../../../../core/Multichain/utils', () => ({
  getFormattedAddressFromInternalAccount: (...args: unknown[]) =>
    mockGetFormattedAddressFromInternalAccount(...args),
}));

const SOURCE_ASSET_ID =
  'eip155:143/erc20:0x754704bc059f8c67012fed69bc8a327a5aafb603' as Caip19AssetId;
const DEST_ASSET_ID =
  'eip155:143/erc20:0x754704bc059f8c67012fed69bc8a327a5aafb604' as Caip19AssetId;
const DELEGATOR_ADDRESS = '0x4751FD55E5B9723f427Cf1a298f785Ec2adCf123';

const VALID_RESPONSE = {
  chainId: 'eip155:143',
  delegationManager: '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3',
  swapRouter: '0x962287c9d5B8a682389E61edAE90ec882325d08b',
  approvalRequired: true,
  order: {
    clientOrderId: '26b0d825-79da-45a9-ab7d-1397a091b80e',
    account: `eip155:143:${DELEGATOR_ADDRESS}`,
    src: { assetId: SOURCE_ASSET_ID, amount: '1000000', minAmount: '975000' },
    dest: { assetId: DEST_ASSET_ID, amount: '1000000', minAmount: '975000' },
    priceTolerance: 250,
    expiresAt: 1789054610,
  },
  delegations: [
    {
      purpose: 'swap',
      delegation: {
        delegate: '0x0000000000000000000000000000000000000a11',
        delegator: DELEGATOR_ADDRESS,
        authority:
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        caveats: [
          {
            enforcer: '0x7F20f61b1f09b08D970938F6fa563634d65c4EeB',
            terms: '0x754704bc059f8c67012fed69bc8a327a5aafb603',
            args: '0x',
          },
        ],
        salt: '0x6572bcee6cc79e0b70128c9dd1f65f0075ebcac9b8aa38e8b6af0fa4757f2050',
        signature: '0x',
      },
      typedData: {
        domain: {
          name: 'DelegationManager',
          version: '1',
          chainId: 143,
          verifyingContract: '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3',
        },
        primaryType: 'Delegation',
        types: {
          EIP712Domain: [{ name: 'name', type: 'string' }],
          Delegation: [{ name: 'delegate', type: 'address' }],
        },
        message: { delegate: '0x0000000000000000000000000000000000000a11' },
      },
    },
  ],
};

const ORDER_PARAMS = {
  sourceAssetId: SOURCE_ASSET_ID,
  sourceAmount: '1000000',
  destAssetId: DEST_ASSET_ID,
  destAmount: '1000000',
  costTolerance: '2.5',
  expiresInMinutes: 60,
};

const renderFetchLimitOrdersDelegations = () =>
  renderHookWithProvider(() => useFetchLimitOrdersDelegations(ORDER_PARAMS), {
    state: {},
  }).result.current.fetchLimitOrdersDelegations;

const getClientOrderId = (url: string) =>
  new URL(url).searchParams.get('clientOrderId');

describe('useFetchLimitOrdersDelegations', () => {
  let globalFetchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBearerToken.mockResolvedValue('mock-bearer-token');
    mockGetSelectedAccountByScope.mockReturnValue(MOCK_ACCOUNT);
    mockGetFormattedAddressFromInternalAccount.mockReturnValue(
      DELEGATOR_ADDRESS,
    );
    globalFetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => VALID_RESPONSE,
    } as Response);
  });

  afterEach(() => {
    globalFetchSpy.mockRestore();
  });

  it('fetches with the expected URL and headers and returns the validated response', async () => {
    const fetchLimitOrdersDelegations = renderFetchLimitOrdersDelegations();

    const result = await fetchLimitOrdersDelegations();

    expect(result).toStrictEqual(VALID_RESPONSE);
    expect(globalFetchSpy).toHaveBeenCalledTimes(1);
    const [url, requestOptions] = globalFetchSpy.mock.calls[0];
    expect(url).toContain('/v2/orders/limit/delegations?');
    expect(url).toContain(
      `accountAddress=${encodeURIComponent(`eip155:143:${DELEGATOR_ADDRESS}`)}`,
    );
    expect(url).toContain('priceTolerance=2.5');
    expect(url).toContain('expiresInMinutes=60');
    expect(url).toMatch(/clientOrderId=[0-9a-f-]{36}/u);
    expect(requestOptions).toMatchObject({
      method: 'GET',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    });
  });

  it('keeps the same clientOrderId while the order params are unchanged', async () => {
    const { result, rerender } = renderHookWithProvider(
      () => useFetchLimitOrdersDelegations(ORDER_PARAMS),
      { state: {} },
    );

    await result.current.fetchLimitOrdersDelegations();
    rerender({});
    await result.current.fetchLimitOrdersDelegations();

    expect(getClientOrderId(globalFetchSpy.mock.calls[0][0])).toBe(
      getClientOrderId(globalFetchSpy.mock.calls[1][0]),
    );
  });

  it('generates a new clientOrderId when the order params change', async () => {
    let params = ORDER_PARAMS;
    const { result, rerender } = renderHookWithProvider(
      () => useFetchLimitOrdersDelegations(params),
      { state: {} },
    );

    await result.current.fetchLimitOrdersDelegations();
    params = { ...ORDER_PARAMS, sourceAmount: '2000000' };
    rerender({});
    await result.current.fetchLimitOrdersDelegations();

    expect(getClientOrderId(globalFetchSpy.mock.calls[0][0])).not.toBe(
      getClientOrderId(globalFetchSpy.mock.calls[1][0]),
    );
  });

  it('throws without fetching when the delegator account cannot be resolved', async () => {
    mockGetSelectedAccountByScope.mockReturnValue(undefined);
    const fetchLimitOrdersDelegations = renderFetchLimitOrdersDelegations();

    await expect(fetchLimitOrdersDelegations()).rejects.toThrow(
      /Missing delegator account/u,
    );
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });

  it('throws when the response is not ok', async () => {
    globalFetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);
    const fetchLimitOrdersDelegations = renderFetchLimitOrdersDelegations();

    await expect(fetchLimitOrdersDelegations()).rejects.toThrow(/status 500/u);
  });

  it('throws a descriptive error when the response fails schema validation', async () => {
    globalFetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ ...VALID_RESPONSE, approvalRequired: 'nope' }),
    } as Response);
    const fetchLimitOrdersDelegations = renderFetchLimitOrdersDelegations();

    await expect(fetchLimitOrdersDelegations()).rejects.toThrow(
      /Invalid limit order delegations response/u,
    );
  });
});
