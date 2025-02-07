import { renderHook } from '@testing-library/react-hooks';
import { selectEvmChainId } from '../../../selectors/networkController';
import { TEST_NETWORK_IDS } from '../../../constants/network';
import { selectShowFiatInTestnets } from '../../../selectors/settings';
import useHideFiatForTestnet from './index';

jest.mock('react-redux', () => ({
  useSelector: jest.fn().mockImplementation((selector) => selector()),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectEvmChainId: jest.fn(),
}));

jest.mock('../../../selectors/settings', () => ({
  selectShowFiatInTestnets: jest.fn(),
}));

describe('useHideFiatForTestnet', () => {
  const mockSelectShowFiatInTestnets = jest.mocked(selectShowFiatInTestnets);
  const mockSelectEvmChainId = jest.mocked(selectEvmChainId);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('utilizes the specified chain id', () => {
    mockSelectShowFiatInTestnets.mockReturnValue(false);
    mockSelectEvmChainId.mockReturnValue(TEST_NETWORK_IDS[0]);

    const { result } = renderHook(() => useHideFiatForTestnet('0x1'));

    expect(result.current).toBe(false);
  });

  it('returns true if current network is a testnet and showFiatInTestnets is false', () => {
    mockSelectShowFiatInTestnets.mockReturnValue(false);
    mockSelectEvmChainId.mockReturnValue(TEST_NETWORK_IDS[0]);

    const { result } = renderHook(() => useHideFiatForTestnet());

    expect(result.current).toBe(true);
  });

  it('returns false if current network is a testnet and showFiatInTestnets is true', () => {
    mockSelectShowFiatInTestnets.mockReturnValue(true);
    mockSelectEvmChainId.mockReturnValue(TEST_NETWORK_IDS[0]);

    const { result } = renderHook(() => useHideFiatForTestnet());

    expect(result.current).toBe(false);
  });

  it('returns false if current network is not a testnet', () => {
    mockSelectShowFiatInTestnets.mockReturnValue(false);
    mockSelectEvmChainId.mockReturnValue('0x1');

    const { result } = renderHook(() => useHideFiatForTestnet());

    expect(result.current).toBe(false);
  });

  it('returns false if current network is not a testnet but showFiatInTestnets is true', () => {
    mockSelectShowFiatInTestnets.mockReturnValue(true);
    mockSelectEvmChainId.mockReturnValue('0x1');

    const { result } = renderHook(() => useHideFiatForTestnet());

    expect(result.current).toBe(false);
  });
});
