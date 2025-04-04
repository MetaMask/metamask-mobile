import { NETWORKS_CHAIN_ID } from '../../../constants/network';
import { useFirstPartyContractNames } from './useFirstPartyContractNames';
import { NameType } from '../../UI/Name/Name.types';

const BRIDGE_NAME_MOCK = 'Bridge';
const BRIDGE_MAINNET_ADDRESS_MOCK =
  '0x0439e60F02a8900a951603950d8D4527f400C3f1';
const UNKNOWN_ADDRESS_MOCK = '0xabc123';

describe('useFirstPartyContractNames', () => {
  it('returns null if no name found', () => {
    const name = useFirstPartyContractNames([
      {
        type: NameType.EthereumAddress,
        value: UNKNOWN_ADDRESS_MOCK,
        variation: NETWORKS_CHAIN_ID.MAINNET,
      },
    ])[0];

    expect(name).toBe(null);
  });

  it('returns name if found', () => {
    const name = useFirstPartyContractNames([
      {
        type: NameType.EthereumAddress,
        value: BRIDGE_MAINNET_ADDRESS_MOCK,
        variation: NETWORKS_CHAIN_ID.MAINNET,
      },
    ])[0];

    expect(name).toBe(BRIDGE_NAME_MOCK);
  });

  it('normalizes addresses to lowercase', () => {
    const name = useFirstPartyContractNames([
      {
        type: NameType.EthereumAddress,
        value: BRIDGE_MAINNET_ADDRESS_MOCK.toUpperCase(),
        variation: NETWORKS_CHAIN_ID.MAINNET,
      },
    ])[0];

    expect(name).toBe(BRIDGE_NAME_MOCK);
  });
});
