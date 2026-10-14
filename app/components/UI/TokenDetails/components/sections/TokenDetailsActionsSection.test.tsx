import React from 'react';
import { Text, View } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { renderHook } from '@testing-library/react-hooks';
import type { OrderDirection } from '@metamask/perps-controller';

import TokenDetailsActionsSection, {
  TOKEN_DETAILS_ACTIONS_SECTION_TEST_ID,
  useGatedPerpsEntry,
} from './TokenDetailsActionsSection';
import type { TokenDetailsRouteParams } from '../../constants/constants';

const mockTrack = jest.fn();
const mockGate = jest.fn(async (action: () => Promise<unknown>) => action());
const mockHandlePerpsAction = jest.fn();
const mockOnBuy = jest.fn();
const mockOnSend = jest.fn();
const mockOnReceive = jest.fn();
const mockOnActionTapped = jest.fn();

let mockIsEligible = true;
let mockHasPerpsMarket = true;
let mockIsPerpsLoading = false;
let mockIsBuyable = false;
let mockIsBuyableLoading = false;

const capturedPerpsActionsParams: { symbol: string | null }[] = [];
const capturedTokenDetailsActionsProps: Record<string, unknown>[] = [];

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn((selector: (state: unknown) => unknown) => selector({})),
}));

jest.mock('../../../Perps/hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
}));

jest.mock('../../../Compliance', () => ({
  useComplianceGate: () => ({ gate: mockGate }),
}));

jest.mock('../../../Perps/selectors/perpsController', () => ({
  selectPerpsEligibility: () => mockIsEligible,
}));

jest.mock('../../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountAddress: () => '0xabc',
}));

jest.mock('../../../Perps/components/PerpsBottomSheetTooltip', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => (
      <RNText testID={testID}>geo-block-tooltip</RNText>
    ),
  };
});

jest.mock('../../hooks/usePerpsActions', () => ({
  usePerpsActions: (params: { symbol: string | null }) => {
    capturedPerpsActionsParams.push(params);
    return {
      hasPerpsMarket: mockHasPerpsMarket,
      marketData: null,
      isLoading: mockIsPerpsLoading,
      error: null,
      handlePerpsAction: mockHasPerpsMarket ? mockHandlePerpsAction : undefined,
    };
  },
}));

jest.mock('../TokenDetailsActions', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    TokenDetailsActions: (props: Record<string, unknown>) => {
      capturedTokenDetailsActionsProps.push(props);
      return <RNView testID="mock-token-details-actions" />;
    },
  };
});

jest.mock('../../hooks/useTokenActions', () => ({
  useTokenActions: () => ({
    onBuy: mockOnBuy,
    onSend: mockOnSend,
    onReceive: mockOnReceive,
  }),
}));

jest.mock('../../../Ramp/hooks/useTokenBuyability', () => ({
  __esModule: true,
  default: () => ({
    isBuyable: mockIsBuyable,
    isLoading: mockIsBuyableLoading,
  }),
}));

jest.mock('../../hooks/useTokenDetailsActionTracking', () => ({
  useTokenDetailsActionTracking: () => mockOnActionTapped,
}));

interface HarnessParams {
  handlePerpsAction?: ((direction: OrderDirection) => void) | undefined;
  onExitAction?: () => void;
  resetNavigationLockRef?: React.RefObject<(() => void) | null>;
}

const probe = (params: HarnessParams) => {
  const Harness = () => {
    const {
      onLong,
      onShort,
      isEligibilityModalVisible,
      closeEligibilityModal,
      geoBlockTooltip,
    } = useGatedPerpsEntry({
      handlePerpsAction: params.handlePerpsAction,
      onExitAction: params.onExitAction,
      resetNavigationLockRef: params.resetNavigationLockRef,
    });

    return (
      <View>
        <Text onPress={onLong} testID="long-entry">
          long
        </Text>
        <Text onPress={onShort} testID="short-entry">
          short
        </Text>
        <Text onPress={closeEligibilityModal} testID="close-modal">
          close
        </Text>
        <Text testID="modal-visible">
          {isEligibilityModalVisible ? 'visible' : 'hidden'}
        </Text>
        {geoBlockTooltip}
      </View>
    );
  };
  return render(<Harness />);
};

const baseToken = {
  address: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  chainId: '0x1',
  symbol: 'PEPE',
  name: 'Pepe',
  isETH: false,
  isNative: false,
  balance: '100',
  balanceError: null,
  image: '',
  logo: '',
  aggregators: [],
  decimals: 18,
} as unknown as TokenDetailsRouteParams;

describe('useGatedPerpsEntry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEligible = true;
  });

  it('hides Long/Short handlers when there is no perps market', () => {
    const { result } = renderHook(() =>
      useGatedPerpsEntry({ handlePerpsAction: undefined }),
    );

    expect(result.current.onLong).toBeUndefined();
    expect(result.current.onShort).toBeUndefined();
  });

  it('hands eligible users to the perps navigation and tracks the exit', async () => {
    const onExitAction = jest.fn();
    const { getByTestId } = probe({
      handlePerpsAction: mockHandlePerpsAction,
      onExitAction,
    });

    fireEvent.press(getByTestId('long-entry'));

    await waitFor(() => {
      expect(mockHandlePerpsAction).toHaveBeenCalledWith('long');
    });
    expect(onExitAction).toHaveBeenCalledTimes(1);
    expect(getByTestId('modal-visible').props.children).toBe('hidden');
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('short entry passes the short direction', async () => {
    const { getByTestId } = probe({
      handlePerpsAction: mockHandlePerpsAction,
    });

    fireEvent.press(getByTestId('short-entry'));

    await waitFor(() => {
      expect(mockHandlePerpsAction).toHaveBeenCalledWith('short');
    });
  });

  it('shows the geo-block tooltip and tracks the screen event when ineligible', async () => {
    mockIsEligible = false;
    const { getByTestId, getByText } = probe({
      handlePerpsAction: mockHandlePerpsAction,
    });

    fireEvent.press(getByTestId('long-entry'));

    await waitFor(() => {
      expect(getByTestId('token-details-geo-block-tooltip')).toBeOnTheScreen();
    });
    expect(mockHandlePerpsAction).not.toHaveBeenCalled();
    expect(getByText('geo-block-tooltip')).toBeTruthy();
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it('releases the navigation lock when the gate settles without navigating', async () => {
    mockIsEligible = false;
    const resetNavigationLock = jest.fn();
    const lockRef = { current: resetNavigationLock } as React.RefObject<
      () => void
    >;
    const { getByTestId } = probe({
      handlePerpsAction: mockHandlePerpsAction,
      resetNavigationLockRef: lockRef,
    });

    fireEvent.press(getByTestId('long-entry'));

    await waitFor(() => {
      expect(resetNavigationLock).toHaveBeenCalledTimes(1);
    });
  });

  it('dismisses the geo-block tooltip via closeEligibilityModal', async () => {
    mockIsEligible = false;
    const { getByTestId, queryByText } = probe({
      handlePerpsAction: mockHandlePerpsAction,
    });

    fireEvent.press(getByTestId('long-entry'));

    await waitFor(() => {
      expect(getByTestId('modal-visible').props.children).toBe('visible');
    });

    fireEvent.press(getByTestId('close-modal'));

    await waitFor(() => {
      expect(getByTestId('modal-visible').props.children).toBe('hidden');
    });
    expect(queryByText('geo-block-tooltip')).toBeNull();
  });
});

describe('TokenDetailsActionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedTokenDetailsActionsProps.length = 0;
    capturedPerpsActionsParams.length = 0;
    mockIsEligible = true;
    mockHasPerpsMarket = true;
    mockIsPerpsLoading = false;
    mockIsBuyable = false;
    mockIsBuyableLoading = false;
  });

  it('renders the reused legacy action row', () => {
    const { getByTestId } = render(
      <TokenDetailsActionsSection token={baseToken} />,
    );

    expect(
      getByTestId(TOKEN_DETAILS_ACTIONS_SECTION_TEST_ID),
    ).toBeOnTheScreen();
    expect(getByTestId('mock-token-details-actions')).toBeOnTheScreen();
  });

  it('self-wires the visibility inputs and handlers into the action row (V1 wiring)', () => {
    render(
      <TokenDetailsActionsSection
        token={baseToken}
        networkName="Ethereum"
        severity="bad"
      />,
    );

    expect(capturedTokenDetailsActionsProps).toHaveLength(1);
    const props = capturedTokenDetailsActionsProps[0];

    expect(props.hasPerpsMarket).toBe(true);
    expect(props.hasBalance).toBe(true);
    expect(props.isBuyable).toBe(false);
    expect(props.isNativeCurrency).toBe(false);
    expect(props.token).toBe(baseToken);
    expect(props.isLoading).toBe(false);

    expect(props.onBuy).toBe(mockOnBuy);
    expect(props.onSend).toBe(mockOnSend);
    expect(props.onReceive).toBe(mockOnReceive);
    expect(typeof props.onLong).toBe('function');
    expect(typeof props.onShort).toBe('function');
    expect(props.onActionTapped).toBe(mockOnActionTapped);

    expect(capturedPerpsActionsParams[0].symbol).toBe('PEPE');
  });

  it('loads with the legacy skeleton while perps or buyability resolve', () => {
    mockIsPerpsLoading = true;
    mockIsBuyableLoading = true;

    render(<TokenDetailsActionsSection token={baseToken} />);

    expect(capturedTokenDetailsActionsProps[0].isLoading).toBe(true);
  });

  it('has no Long/Short handlers when the token has no perps market', () => {
    mockHasPerpsMarket = false;

    render(<TokenDetailsActionsSection token={baseToken} />);

    const props = capturedTokenDetailsActionsProps[0];

    expect(props.hasPerpsMarket).toBe(false);
    expect(props.hasBalance).toBe(true);
    expect(props.onLong).toBeUndefined();
    expect(props.onShort).toBeUndefined();
  });

  it('treats a zero balance as no balance for visibility', () => {
    const emptyToken = {
      ...baseToken,
      balance: '0',
    } as unknown as TokenDetailsRouteParams;

    render(<TokenDetailsActionsSection token={emptyToken} />);

    expect(capturedTokenDetailsActionsProps[0].hasBalance).toBe(false);
  });

  it('prefers injected perps market state and skips the self lookup (legacy wiring)', () => {
    render(
      <TokenDetailsActionsSection
        token={baseToken}
        perpsMarket={{
          hasPerpsMarket: false,
          isLoading: false,
          handlePerpsAction: mockHandlePerpsAction,
        }}
      />,
    );

    expect(capturedPerpsActionsParams[0].symbol).toBeNull();

    const props = capturedTokenDetailsActionsProps[0];
    expect(props.hasPerpsMarket).toBe(false);
    expect(typeof props.onLong).toBe('function');
    expect(typeof props.onShort).toBe('function');
  });

  it('uses injected handlers, balance flag and tracker (legacy wiring)', () => {
    const injectedOnBuy = jest.fn();
    const injectedOnSend = jest.fn();
    const injectedOnReceive = jest.fn();
    const injectedTracker = jest.fn();

    render(
      <TokenDetailsActionsSection
        token={baseToken}
        onBuy={injectedOnBuy}
        onSend={injectedOnSend}
        onReceive={injectedOnReceive}
        hasBalance={false}
        onActionTapped={injectedTracker}
      />,
    );

    const props = capturedTokenDetailsActionsProps[0];
    expect(props.onBuy).toBe(injectedOnBuy);
    expect(props.onSend).toBe(injectedOnSend);
    expect(props.onReceive).toBe(injectedOnReceive);
    expect(props.hasBalance).toBe(false);
    expect(props.onActionTapped).toBe(injectedTracker);
  });

  it('reports the effective perps market resolution through the callback', () => {
    const onPerpsMarketResolved = jest.fn();

    render(
      <TokenDetailsActionsSection
        token={baseToken}
        onPerpsMarketResolved={onPerpsMarketResolved}
      />,
    );

    expect(onPerpsMarketResolved).toHaveBeenCalledWith({
      hasPerpsMarket: true,
      isLoading: false,
    });
  });

  it('passes exit-action and lock-ref through to the gated entry handler', async () => {
    const onExitAction = jest.fn();
    const resetNavigationLockRef = { current: jest.fn() };

    render(
      <TokenDetailsActionsSection
        token={baseToken}
        onExitAction={onExitAction}
        resetNavigationLockRef={resetNavigationLockRef}
      />,
    );

    const props = capturedTokenDetailsActionsProps[0];
    (props.onLong as () => void)();

    await waitFor(() => {
      expect(mockHandlePerpsAction).toHaveBeenCalledWith('long');
    });
    expect(onExitAction).toHaveBeenCalledTimes(1);
    expect(resetNavigationLockRef.current).toHaveBeenCalledTimes(1);
  });
});
