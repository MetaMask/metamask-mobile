import { useNetworkName } from './useNetworkName';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import type { CaipChainId } from '@metamask/utils';

jest.mock('../../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../../selectors/networkController'),
  selectNetworkConfigurationsByCaipChainId: jest.fn(),
}));

import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';

const mockSelector = jest.mocked(selectNetworkConfigurationsByCaipChainId);

const renderUseNetworkName = (selectedNetwork: CaipChainId[] | null) =>
  renderHookWithProvider(() => useNetworkName(selectedNetwork));

describe('useNetworkName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelector.mockImplementation(() => ({}));
  });

  it('returns "All networks" when selectedNetwork is null', () => {
    const { result } = renderUseNetworkName(null);

    expect(result.current).toBe('All networks');
  });

  it('returns "All networks" when selectedNetwork is empty', () => {
    const { result } = renderUseNetworkName([]);

    expect(result.current).toBe('All networks');
  });

  it('returns network name from user-configured networks', () => {
    const caipId = 'eip155:42161' as CaipChainId;
    mockSelector.mockImplementation(
      () =>
        ({
          [caipId]: { name: 'My Custom Arbitrum' },
        }) as ReturnType<typeof selectNetworkConfigurationsByCaipChainId>,
    );

    const { result } = renderUseNetworkName([caipId]);

    expect(result.current).toBe('My Custom Arbitrum');
  });

  it('falls back to PopularList nickname for eip155 chain not in user config', () => {
    const avalancheCaipId = 'eip155:43114' as CaipChainId;

    const { result } = renderUseNetworkName([avalancheCaipId]);

    expect(result.current).toBe('Avalanche');
  });

  it('returns "All networks" for eip155 chain not in user config or PopularList', () => {
    const unknownCaipId = 'eip155:99999' as CaipChainId;

    const { result } = renderUseNetworkName([unknownCaipId]);

    expect(result.current).toBe('All networks');
  });

  it('returns "All networks" for non-eip155 namespace not in user config', () => {
    const solanaId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;

    const { result } = renderUseNetworkName([solanaId]);

    expect(result.current).toBe('All networks');
  });

  it('returns "All networks" when CAIP chain ID parsing fails', () => {
    const malformedId = 'not-a-valid-caip-id' as CaipChainId;

    const { result } = renderUseNetworkName([malformedId]);

    expect(result.current).toBe('All networks');
  });

  it('uses only the first element when multiple chain IDs are provided', () => {
    const caipId = 'eip155:43114' as CaipChainId;
    const secondId = 'eip155:42161' as CaipChainId;

    const { result } = renderUseNetworkName([caipId, secondId]);

    expect(result.current).toBe('Avalanche');
  });
});
