import { Hex } from '@metamask/utils';
import { useNetworkName } from './useNetworkName';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { merge } from 'lodash';
import { otherControllersMock } from '../__mocks__/controllers/other-controllers-mock';

const CHAIN_ID_CUSTOM_MOCK = '0x123';
const NAME_CUSTOM_MOCK = 'Custom Network';

function runHook(chainId: Hex | undefined) {
  const { result } = renderHookWithProvider(() => useNetworkName(chainId), {
    state: merge({}, otherControllersMock, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [CHAIN_ID_CUSTOM_MOCK]: {
                name: NAME_CUSTOM_MOCK,
              },
            },
          },
        },
      },
    }),
  });

  return result;
}

describe('useNetworkName', () => {
  it('returns undefined if chainId is undefined', () => {
    const result = runHook(undefined);
    expect(result.current).toBeUndefined();
  });

  it('returns short name from network list', () => {
    const result = runHook('0x1');
    expect(result.current).toBe('Ethereum');
  });

  it('returns nickname from network configuration if network list name is not available', () => {
    const result = runHook(CHAIN_ID_CUSTOM_MOCK);
    expect(result.current).toBe(NAME_CUSTOM_MOCK);
  });

  it('returns chain ID if no name or nickname is available', () => {
    const unknownChainId = '0x9999';
    const result = runHook(unknownChainId);
    expect(result.current).toBe(unknownChainId);
  });
});
