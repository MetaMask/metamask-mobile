import { act, renderHook } from '@testing-library/react-hooks';
import type { TokenI } from '../../Tokens/types';
import { EVENT_LOCATIONS } from '../constants/events/earnEvents';
import { useStablecoinLendingRedirect } from './useStablecoinLendingRedirect';

const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../../constants/navigation/Routes', () => ({
  __esModule: true,
  default: {
    STAKING: {
      STAKE: 'Stake',
    },
  },
}));

jest.mock('../../../hooks/useMetrics', () => ({
  MetaMetricsEvents: {
    EARN_BUTTON_CLICKED: 'EARN_BUTTON_CLICKED',
  },
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useSelector: (selector: (state: unknown) => unknown) => selector({}),
  };
});

const mockTrace = jest.fn();
jest.mock('../../../../util/trace', () => ({
  TraceName: {
    EarnDepositScreen: 'EarnDepositScreen',
  },
  trace: (arg: unknown) => mockTrace(arg),
}));

const mockSelectNetworkConfigurationByChainId = jest.fn();
jest.mock('../../../../selectors/networkController', () => ({
  selectNetworkConfigurationByChainId: (state: unknown, chainId: unknown) =>
    mockSelectNetworkConfigurationByChainId(state, chainId),
}));

const mockSetActiveNetwork = jest.fn(
  async (_networkClientId: string) => undefined,
);
const mockFindNetworkClientIdByChainId = jest.fn(
  (_chainIdHex: string) => undefined as string | undefined,
);
jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      setActiveNetwork: (networkClientId: string) =>
        mockSetActiveNetwork(networkClientId),
      findNetworkClientIdByChainId: (chainIdHex: string) =>
        mockFindNetworkClientIdByChainId(chainIdHex),
    },
  },
}));

describe('useStablecoinLendingRedirect', () => {
  const createMockBuilder = () => {
    const builder = {
      addProperties: jest.fn(),
      build: jest.fn(),
    };

    builder.addProperties.mockImplementation(() => builder);
    builder.build.mockReturnValue({ event: 'EARN_BUTTON_CLICKED' });

    return builder;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectNetworkConfigurationByChainId.mockReturnValue({
      name: 'Mainnet',
    });
  });

  it('does nothing when asset chainId is missing', async () => {
    const { result } = renderHook(() =>
      useStablecoinLendingRedirect({
        asset: undefined,
      }),
    );

    await act(async () => {
      await result.current();
    });

    expect(mockFindNetworkClientIdByChainId).not.toHaveBeenCalled();
    expect(mockSetActiveNetwork).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('logs error and exits when network client id cannot be found', async () => {
    mockFindNetworkClientIdByChainId.mockReturnValue(undefined);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const onNavigate = jest.fn();
    const asset: TokenI = {
      address: '0x123',
      chainId: '1',
      symbol: 'USDC',
      decimals: 6,
      isETH: false,
      aggregators: [],
      image: '',
      name: 'USD Coin',
      balance: '0',
      logo: '',
    };

    const { result } = renderHook(() =>
      useStablecoinLendingRedirect({
        asset,
        onNavigate,
      }),
    );

    await act(async () => {
      await result.current();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Stablecoin lending redirect failed: could not retrieve networkClientId for chainId: 1',
    );
    expect(mockSetActiveNetwork).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('switches network, tracks event, and calls onNavigate when provided', async () => {
    mockFindNetworkClientIdByChainId.mockReturnValue('mainnet');

    const builder = createMockBuilder();
    mockCreateEventBuilder.mockReturnValue(builder);

    const onNavigate = jest.fn();
    const asset: TokenI = {
      address: '0x123',
      chainId: '1',
      symbol: 'USDC',
      decimals: 6,
      isETH: false,
      aggregators: [],
      image: '',
      name: 'USD Coin',
      balance: '0',
      logo: '',
    };

    const { result } = renderHook(() =>
      useStablecoinLendingRedirect({
        asset,
        location: EVENT_LOCATIONS.HOME_SCREEN,
        onNavigate,
      }),
    );

    await act(async () => {
      await result.current();
    });

    expect(mockFindNetworkClientIdByChainId).toHaveBeenCalledWith('0x1');
    expect(mockTrace).toHaveBeenCalledWith({ name: 'EarnDepositScreen' });
    expect(mockSetActiveNetwork).toHaveBeenCalledWith('mainnet');
    expect(mockCreateEventBuilder).toHaveBeenCalledWith('EARN_BUTTON_CLICKED');
    expect(builder.addProperties).toHaveBeenCalledWith({
      action_type: 'deposit',
      location: EVENT_LOCATIONS.HOME_SCREEN,
      network: 'Mainnet',
      text: 'Earn',
      token: 'USDC',
      experience: 'STABLECOIN_LENDING',
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({
      event: 'EARN_BUTTON_CLICKED',
    });
    expect(onNavigate).toHaveBeenCalledWith(asset);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('switches network, tracks event, and navigates when onNavigate is not provided', async () => {
    mockFindNetworkClientIdByChainId.mockReturnValue('mainnet');

    const builder = createMockBuilder();
    mockCreateEventBuilder.mockReturnValue(builder);

    const asset: TokenI = {
      address: '0x123',
      chainId: '1',
      symbol: 'USDC',
      decimals: 6,
      isETH: false,
      aggregators: [],
      image: '',
      name: 'USD Coin',
      balance: '0',
      logo: '',
    };

    const { result } = renderHook(() =>
      useStablecoinLendingRedirect({
        asset,
        location: EVENT_LOCATIONS.HOME_SCREEN,
      }),
    );

    await act(async () => {
      await result.current();
    });

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: 'Stake',
      params: {
        token: asset,
      },
    });
  });
});
