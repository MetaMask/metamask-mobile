import { selectChainId } from '../../../selectors/networkController';
import { NETWORKS_CHAIN_ID } from '../../../constants/network';
import { useFirstPartyContractName } from './useFirstPartyContractName';

jest.mock('react-redux', () => ({
  useSelector: (selector: any) => selector(),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectChainId: jest.fn(),
}));

const BRIDGE_NAME_MOCK = 'MetaMask Bridge';
const BRIDGE_MAINNET_ADDRESS_MOCK =
  '0x0439e60F02a8900a951603950d8D4527f400C3f1';
const UNKNOWN_ADDRESS_MOCK = '0xabc123';

describe('useFirstPartyContractName', () => {
  const selectChainIdMock = jest.mocked(selectChainId);
  beforeEach(() => {
    jest.resetAllMocks();
    selectChainIdMock.mockReturnValue(NETWORKS_CHAIN_ID.MAINNET);
  });

  it('returns null if no name found', () => {
    const name = useFirstPartyContractName(
      NETWORKS_CHAIN_ID.MAINNET,
      UNKNOWN_ADDRESS_MOCK,
    );

    expect(name).toBe(null);
  });

  it('returns name if found', () => {
    const name = useFirstPartyContractName(
      NETWORKS_CHAIN_ID.MAINNET,
      BRIDGE_MAINNET_ADDRESS_MOCK,
    );
    expect(name).toBe(BRIDGE_NAME_MOCK);
  });

  it('normalizes addresses to lowercase', () => {
    const name = useFirstPartyContractName(
      NETWORKS_CHAIN_ID.MAINNET,
      BRIDGE_MAINNET_ADDRESS_MOCK.toUpperCase(),
    );

    expect(name).toBe(BRIDGE_NAME_MOCK);
  });
});
