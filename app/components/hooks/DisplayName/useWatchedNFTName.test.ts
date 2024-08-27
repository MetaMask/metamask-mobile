import { useWatchedNFTName } from './useWatchedNFTName';
import { collectibleContractsSelector } from '../../../reducers/collectibles';

const KNOWN_NFT_ADDRESS_CHECKSUMMED =
  '0x495f947276749Ce646f68AC8c248420045cb7b5e';
const KNOWN_NFT_NAME_MOCK = 'Known NFT';
const COLLECTIBLES_MOCK = [
  {
    name: KNOWN_NFT_NAME_MOCK,
    address: KNOWN_NFT_ADDRESS_CHECKSUMMED,
  },
];

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation((callback) => callback()),
}));

jest.mock('../../../reducers/collectibles', () => ({
  collectibleContractsSelector: jest.fn(),
}));

describe('useWatchedNFTName', () => {
  const normalizedAddress = KNOWN_NFT_ADDRESS_CHECKSUMMED.toLowerCase();
  const collectibleContractsSelectorMock = jest.mocked(
    collectibleContractsSelector,
  );

  beforeAll(() => {
    collectibleContractsSelectorMock.mockReturnValue(COLLECTIBLES_MOCK);
  });

  it('returns null if no NFT matched', () => {
    const name = useWatchedNFTName(normalizedAddress);
    expect(name).toEqual(KNOWN_NFT_NAME_MOCK);
  });

  it('returns null if name no NFT matched', () => {
    collectibleContractsSelectorMock.mockReturnValue([]);
    const name = useWatchedNFTName(normalizedAddress);
    expect(name).toEqual(null);
  });
});
