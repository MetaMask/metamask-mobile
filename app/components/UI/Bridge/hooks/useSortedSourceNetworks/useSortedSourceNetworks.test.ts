import { initialState } from '../../_mocks_/initialState';
import { useSortedSourceNetworks } from './useSortedSourceNetworks';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => {
  const actual = jest.requireActual('../../../../../core/redux/slices/bridge');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    setSelectedSourceChainIds: jest.fn(actual.setSelectedSourceChainIds),
    setSourceToken: jest.fn(actual.setSourceToken),
  };
});

jest.mock('../../../../Views/NetworkSelector/useSwitchNetworks', () => ({
  useSwitchNetworks: jest.fn(() => ({
    onSetRpcTarget: jest.fn().mockResolvedValue(undefined),
    onNetworkChange: jest.fn(),
  })),
}));

describe('useSortedSourceNetworks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should sort networks by total fiat value in descending order', () => {
    const { result } = renderHookWithProvider(() => useSortedSourceNetworks(), {
      state: initialState,
    });

    const networks = result.current.sortedSourceNetworks;
    expect(networks).toBeDefined();
    expect(networks.length).toBeGreaterThan(0);
    // Verify descending sort order by fiat value
    for (let i = 0; i < networks.length - 1; i++) {
      const currentFiat = networks[i].totalFiatValue ?? 0;
      const nextFiat = networks[i + 1].totalFiatValue ?? 0;
      expect(currentFiat).toBeGreaterThanOrEqual(nextFiat);
    }
  });
});
