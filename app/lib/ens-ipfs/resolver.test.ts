import { encodeAbiParameters } from 'viem';
import resolveEnsToIpfsContentId, { isGatewayUrl } from './resolver';
import { IPFS_GATEWAY_DISABLED_ERROR } from '../../components/Views/BrowserTab/constants';

const mockReadContract = jest.fn();
let mockIsIpfsGatewayEnabled = true;

jest.mock('../../core/Engine', () => ({
  context: {
    PreferencesController: {
      get state() {
        return { isIpfsGatewayEnabled: mockIsIpfsGatewayEnabled };
      },
    },
  },
}));

jest.mock('viem', () => ({
  ...jest.requireActual('viem'),
  createPublicClient: () => ({ readContract: mockReadContract }),
}));

// contenthash for ipfs://QmRAQB6YaCyidP37UdDnjFY5vQuiBrcqdyoW1CuDgwxkD4
const IPFS_CONTENTHASH =
  '0xe3010170122029f2d17be6139079dc48696d1f582a8530eb9805b561eda517e22a892c7e3f1f';
const EXPECTED_IPFS_HASH = 'QmRAQB6YaCyidP37UdDnjFY5vQuiBrcqdyoW1CuDgwxkD4';
const provider = { request: jest.fn() };

const encodeResolveResult = (contenthash: `0x${string}`) =>
  encodeAbiParameters([{ type: 'bytes' }], [contenthash]);

describe('resolveEnsToIpfsContentId', () => {
  beforeEach(() => {
    mockIsIpfsGatewayEnabled = true;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resolves the content hash through the Universal Resolver', async () => {
    mockReadContract.mockResolvedValue([
      encodeResolveResult(IPFS_CONTENTHASH),
      '0x0000000000000000000000000000000000000001',
    ]);

    const result = await resolveEnsToIpfsContentId({
      provider,
      name: 'vitalik.eth',
      chainId: '0x1',
    });

    expect(result).toEqual({ type: 'ipfs-ns', hash: EXPECTED_IPFS_HASH });
    expect(mockReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0xce01f8eee7E479C928F8919abD53E553a36CeF67',
        functionName: 'resolve',
      }),
    );
  });

  it('throws when the name has no content hash', async () => {
    mockReadContract.mockResolvedValue([
      encodeResolveResult('0x'),
      '0x0000000000000000000000000000000000000001',
    ]);

    await expect(
      resolveEnsToIpfsContentId({
        provider,
        name: 'vitalik.eth',
        chainId: '0x1',
      }),
    ).rejects.toThrow('EnsIpfsResolver - no content hash found');
  });

  it('throws when the Universal Resolver returns no data', async () => {
    mockReadContract.mockResolvedValue([
      '0x',
      '0x0000000000000000000000000000000000000000',
    ]);

    await expect(
      resolveEnsToIpfsContentId({
        provider,
        name: 'vitalik.eth',
        chainId: '0x1',
      }),
    ).rejects.toThrow('EnsIpfsResolver - no content hash found');
  });

  it('throws when the IPFS gateway is disabled', async () => {
    mockIsIpfsGatewayEnabled = false;
    mockReadContract.mockResolvedValue([
      encodeResolveResult(IPFS_CONTENTHASH),
      '0x0000000000000000000000000000000000000001',
    ]);

    await expect(
      resolveEnsToIpfsContentId({
        provider,
        name: 'vitalik.eth',
        chainId: '0x1',
      }),
    ).rejects.toThrow(IPFS_GATEWAY_DISABLED_ERROR);
  });

  it('throws for unsupported chains without calling the resolver', async () => {
    await expect(
      resolveEnsToIpfsContentId({
        provider,
        name: 'vitalik.eth',
        chainId: '0x89',
      }),
    ).rejects.toThrow(
      'EnsIpfsResolver - no known ens-ipfs registry for chainId',
    );
    expect(mockReadContract).not.toHaveBeenCalled();
  });
});

describe('isGatewayUrl', () => {
  it('detects ipfs, ipns and swarm gateway paths', () => {
    expect(isGatewayUrl({ pathname: '/ipfs/Qm' })).toBe(true);
    expect(isGatewayUrl({ pathname: '/ipns/name' })).toBe(true);
    expect(isGatewayUrl({ pathname: '/bzz:/hash' })).toBe(true);
    expect(isGatewayUrl({ pathname: '/other' })).toBe(false);
  });
});
