import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  NftController,
  type NftControllerMessenger,
} from '@metamask/assets-controllers';
import { getNftControllerMessenger } from '../messengers/nft-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<NftControllerMessenger>,
  MessengerEvents<NftControllerMessenger>
>;

const USER_ADDRESS = '0x0000000000000000000000000000000000000001';
const NFT_ADDRESS = '0x20E1353F8180a1dd161cb3435F97aeC18281e7dC';
const METADATA = {
  name: 'Test Dapp NFTs #2',
  description: 'Test Dapp NFTs for testing.',
  image: 'data:image/svg+xml;base64,PHN2Zy8+',
};

function buildController(tokenURI: string): NftController {
  const rootMessenger: RootMessenger = new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
  const register = rootMessenger.registerActionHandler.bind(rootMessenger) as (
    action: string,
    handler: (...args: never[]) => unknown,
  ) => void;

  register('AccountsController:getSelectedAccount', () => ({
    id: 'account-1',
    address: USER_ADDRESS,
  }));
  register('AccountsController:getAccount', () => ({
    id: 'account-1',
    address: USER_ADDRESS,
  }));
  register('NetworkController:getNetworkClientById', () => ({
    configuration: { chainId: '0x1' },
  }));
  register('AssetsContractController:getERC721TokenURI', async () => tokenURI);
  register('AssetsContractController:getERC721AssetName', async () => 'TDN');
  register('AssetsContractController:getERC721AssetSymbol', async () => 'TDN');
  register('PhishingController:bulkScanUrls', async () => ({ results: {} }));

  return new NftController({
    messenger: getNftControllerMessenger(rootMessenger),
    // Mobile's default; the decode path is skipped when it is off.
    displayNftMedia: true,
  });
}

describe('NftController data: tokenURI handling (#38849)', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    // Production installs react-native-nitro-fetch as global.fetch, which
    // fatally crashes the app when asked to decode a `data:` URL. The NFT API
    // lookup (displayNftMedia on mainnet) may still fetch over HTTPS; let it
    // fail so only the tokenURI metadata is used.
    fetchMock = jest.fn(async () => {
      throw new Error('network disabled in test');
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it.each([
    [
      'base64',
      `data:application/json;base64,${Buffer.from(
        JSON.stringify(METADATA),
      ).toString('base64')}`,
    ],
    [
      'URL-encoded',
      `data:application/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(METADATA),
      )}`,
    ],
  ])(
    'imports an NFT with a %s JSON data: tokenURI without calling fetch',
    async (_label, tokenURI) => {
      const controller = buildController(tokenURI);

      await controller.addNft(NFT_ADDRESS, '2', 'mainnet', {
        userAddress: USER_ADDRESS,
      });

      const fetchedUrls = fetchMock.mock.calls.map(([input]) => String(input));
      expect(fetchedUrls.filter((url) => url.startsWith('data:'))).toEqual([]);
      expect(controller.state.allNfts[USER_ADDRESS]['0x1']).toStrictEqual([
        expect.objectContaining({
          address: NFT_ADDRESS,
          tokenId: '2',
          name: METADATA.name,
          description: METADATA.description,
          image: METADATA.image,
          tokenURI,
        }),
      ]);
    },
  );
});
