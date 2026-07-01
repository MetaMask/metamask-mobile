import { renderHook } from '@testing-library/react-native';

import { NETWORKS_CHAIN_ID } from '../../../constants/network';
import { useFirstPartyContractNames } from './useFirstPartyContractNames';
import { NameType } from '../../UI/Name/Name.types';
import { UseDisplayNameRequest } from './useDisplayName';

const BRIDGE_NAME_MOCK = 'Bridge';
const BRIDGE_MAINNET_ADDRESS_MOCK =
  '0x0439e60F02a8900a951603950d8D4527f400C3f1';
const UNKNOWN_ADDRESS_MOCK = '0xabc123';

describe('useFirstPartyContractNames', () => {
  it('returns null if no name found', () => {
    const { result } = renderHook(() =>
      useFirstPartyContractNames([
        {
          type: NameType.EthereumAddress,
          value: UNKNOWN_ADDRESS_MOCK,
          variation: NETWORKS_CHAIN_ID.MAINNET,
        },
      ]),
    );

    expect(result.current[0]).toBe(null);
  });

  it('returns name if found', () => {
    const { result } = renderHook(() =>
      useFirstPartyContractNames([
        {
          type: NameType.EthereumAddress,
          value: BRIDGE_MAINNET_ADDRESS_MOCK,
          variation: NETWORKS_CHAIN_ID.MAINNET,
        },
      ]),
    );

    expect(result.current[0]).toBe(BRIDGE_NAME_MOCK);
  });

  it('normalizes addresses to lowercase', () => {
    const { result } = renderHook(() =>
      useFirstPartyContractNames([
        {
          type: NameType.EthereumAddress,
          value: BRIDGE_MAINNET_ADDRESS_MOCK.toUpperCase(),
          variation: NETWORKS_CHAIN_ID.MAINNET,
        },
      ]),
    );

    expect(result.current[0]).toBe(BRIDGE_NAME_MOCK);
  });

  it('returns a stable reference across re-renders with identical input', () => {
    const requests: UseDisplayNameRequest[] = [
      {
        type: NameType.EthereumAddress,
        value: BRIDGE_MAINNET_ADDRESS_MOCK,
        variation: NETWORKS_CHAIN_ID.MAINNET,
      },
    ];

    const { result, rerender } = renderHook(() =>
      useFirstPartyContractNames(requests),
    );
    const first = result.current;

    rerender({});

    expect(result.current).toBe(first);
  });
});
