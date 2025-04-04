import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import { NameType } from '../../UI/Name/Name.types';
import { useWatchedNFTNames } from './useWatchedNFTNames';
import { CHAIN_IDS } from '@metamask/transaction-controller';

const KNOWN_NFT_ADDRESS_CHECKSUMMED =
  '0x495f947276749Ce646f68AC8c248420045cb7b5e';

const KNOWN_NFT_NAME_MOCK = 'Known NFT';

const STATE_MOCK = {
  engine: {
    backgroundState: {
      NftController: {
        allNftContracts: {
          '0x123': {
            [CHAIN_IDS.MAINNET]: [
              {
                address: KNOWN_NFT_ADDRESS_CHECKSUMMED.toLowerCase(),
                name: KNOWN_NFT_NAME_MOCK,
              },
            ],
          },
        },
      },
    },
  },
};

describe('useWatchedNFTNames', () => {
  it('returns name if NFT matched', () => {
    const {
      result: { current },
    } = renderHookWithProvider(
      () =>
        useWatchedNFTNames([
          {
            type: NameType.EthereumAddress,
            value: KNOWN_NFT_ADDRESS_CHECKSUMMED,
            variation: CHAIN_IDS.MAINNET,
          },
        ]),
      { state: STATE_MOCK },
    );

    expect(current[0]).toEqual(KNOWN_NFT_NAME_MOCK);
  });

  it('returns null if no NFT matched', () => {
    const {
      result: { current },
    } = renderHookWithProvider(
      () =>
        useWatchedNFTNames([
          {
            type: NameType.EthereumAddress,
            value: '0x123',
            variation: CHAIN_IDS.MAINNET,
          },
        ]),
      { state: STATE_MOCK },
    );

    expect(current[0]).toBeNull();
  });

  it('returns null if type not ethereum address', () => {
    const {
      result: { current },
    } = renderHookWithProvider(
      () =>
        useWatchedNFTNames([
          {
            type: 'alternateType' as NameType,
            value: KNOWN_NFT_ADDRESS_CHECKSUMMED,
            variation: CHAIN_IDS.MAINNET,
          },
        ]),
      { state: STATE_MOCK },
    );

    expect(current[0]).toBeNull();
  });

  it('normalizes value to lowercase', () => {
    const {
      result: { current },
    } = renderHookWithProvider(
      () =>
        useWatchedNFTNames([
          {
            type: NameType.EthereumAddress,
            value: KNOWN_NFT_ADDRESS_CHECKSUMMED.toUpperCase(),
            variation: CHAIN_IDS.MAINNET,
          },
        ]),
      { state: STATE_MOCK },
    );

    expect(current[0]).toBe(KNOWN_NFT_NAME_MOCK);
  });
});
