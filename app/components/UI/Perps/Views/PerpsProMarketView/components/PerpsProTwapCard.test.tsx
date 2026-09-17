import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PERPS_CONSTANTS, type TwapOrder } from '@metamask/perps-controller';
import React from 'react';
import { useSelector } from 'react-redux';
import { PROVIDER_CONFIG } from '../../../constants/perpsConfig';
import {
  getPerpsProTwapMarketSelector,
  getPerpsProTwapTerminateSelector,
  getPerpsProTwapValueSelector,
  PerpsProMarketViewSelectorsIDs,
} from '../../../Perps.testIds';
import { formatProOrderCardTimestamp } from '../../../utils/formatUtils';
import PerpsProTwapCard from './PerpsProTwapCard';

jest.mock('../../../components/PerpsTokenLogo', () => 'PerpsTokenLogo');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => false),
}));

// Tag maps severity into styles without forwarding it. Keep it on the host so
// the status and direction contracts stay assertable.
jest.mock('@metamask/design-system-react-native', () => {
  const ReactLocal = jest.requireActual<typeof React>('react');
  const { Text, View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');

  interface MockTagProps {
    children?: React.ReactNode;
    severity?: string;
    testID?: string;
  }

  const MockTagHost = View as React.ComponentType<MockTagProps>;

  return {
    ...actual,
    Tag: ({ children, severity, testID }: MockTagProps) =>
      ReactLocal.createElement(
        MockTagHost,
        { testID, severity },
        typeof children === 'string' || typeof children === 'number'
          ? ReactLocal.createElement(Text, null, children)
          : children,
      ),
  };
});

const buildTwapOrder = (overrides: Partial<TwapOrder> = {}): TwapOrder => ({
  orderId: 'twap-1',
  symbol: 'BTC',
  side: 'buy',
  size: '10',
  executedSize: '4',
  remainingSize: '6',
  executedNotional: '400',
  averagePrice: '50000',
  fillProgressBps: 4000,
  timeProgressBps: 5000,
  elapsedTimeMilliseconds: 600_000,
  durationMinutes: 30,
  randomize: false,
  reduceOnly: false,
  status: 'active',
  startedAt: 1_700_000_000_000,
  lastUpdated: 1_700_000_600_000,
  fills: [],
  ...overrides,
});

const ids = PerpsProMarketViewSelectorsIDs;
const DEFAULT_PROVIDER_ID = PROVIDER_CONFIG.DefaultProvider;
const DOTS_SHORT = '•'.repeat(6);
const getDefaultValueTestID = (baseTestID: string) =>
  getPerpsProTwapValueSelector(baseTestID, DEFAULT_PROVIDER_ID, 'twap-1');

describe('PerpsProTwapCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useSelector).mockReturnValue(false);
  });

  afterEach(() => {
    // The elapsed clock tests install fake timers; leaving them installed would
    // stall every later test in this file.
    jest.useRealTimers();
  });

  it('renders the schedule market and size', () => {
    // Arrange / Act
    render(<PerpsProTwapCard twapOrder={buildTwapOrder()} />);

    // Assert
    expect(
      screen.getByTestId(getPerpsProTwapMarketSelector('BTC')),
    ).toHaveTextContent('BTC');
    expect(
      screen.getByTestId(getDefaultValueTestID(ids.TWAP_MARKET)),
    ).toHaveTextContent('BTC');
    expect(
      screen.getByTestId(getDefaultValueTestID(ids.TWAP_SIZE)),
    ).toHaveTextContent('10 BTC');
  });

  it('hides total and filled sizes in privacy mode', () => {
    // Arrange
    jest.mocked(useSelector).mockReturnValue(true);

    // Act
    render(<PerpsProTwapCard twapOrder={buildTwapOrder()} />);

    // Assert
    expect(screen.queryByText('10 BTC')).toBeNull();
    expect(screen.queryByText('4 BTC')).toBeNull();
    expect(
      screen.getByTestId(getDefaultValueTestID(ids.TWAP_SIZE)),
    ).toHaveTextContent(DOTS_SHORT);
    expect(
      screen.getByTestId(getDefaultValueTestID(ids.TWAP_FILLED_SIZE)),
    ).toHaveTextContent(DOTS_SHORT);
  });

  it('shows fill progress as a whole percent', () => {
    // Arrange / Act
    render(
      <PerpsProTwapCard
        twapOrder={buildTwapOrder({ fillProgressBps: 2500 })}
      />,
    );

    // Assert
    expect(
      screen.getByTestId(getDefaultValueTestID(ids.TWAP_PROGRESS)),
    ).toHaveTextContent('25%');
  });

  it('renders elapsed against total duration as HH:MM:SS', () => {
    // Arrange
    const startedAt = 1_700_000_000_000;
    jest.useFakeTimers();
    jest.setSystemTime(startedAt + 600_000);

    // Act
    render(<PerpsProTwapCard twapOrder={buildTwapOrder({ startedAt })} />);

    // Assert: ten minutes into a thirty minute schedule
    expect(
      screen.getByTestId(getDefaultValueTestID(ids.TWAP_ELAPSED)),
    ).toHaveTextContent('00:10:00 / 00:30:00');
  });

  it('advances the elapsed clock every second while the schedule is active', () => {
    // Arrange
    const startedAt = 1_700_000_000_000;
    jest.useFakeTimers();
    jest.setSystemTime(startedAt + 28_000);
    render(<PerpsProTwapCard twapOrder={buildTwapOrder({ startedAt })} />);
    const elapsed = screen.getByTestId(getDefaultValueTestID(ids.TWAP_ELAPSED));
    expect(elapsed).toHaveTextContent('00:00:28 / 00:30:00');

    // Act: no new controller snapshot, only the clock moving on
    act(() => {
      jest.advanceTimersByTime(1_000);
    });

    // Assert
    expect(elapsed).toHaveTextContent('00:00:29 / 00:30:00');
  });

  it('derives elapsed from the start time rather than the last snapshot value', () => {
    // Arrange: the venue snapshot is stale, as it is between deliveries
    const startedAt = 1_700_000_000_000;
    jest.useFakeTimers();
    jest.setSystemTime(startedAt + 95_000);

    // Act
    render(
      <PerpsProTwapCard
        twapOrder={buildTwapOrder({ startedAt, elapsedTimeMilliseconds: 0 })}
      />,
    );

    // Assert
    expect(
      screen.getByTestId(getDefaultValueTestID(ids.TWAP_ELAPSED)),
    ).toHaveTextContent('00:01:35 / 00:30:00');
  });

  it('holds a terminal schedule at the elapsed time the venue reported', () => {
    // Arrange: a completed schedule must not keep counting toward its total
    const startedAt = 1_700_000_000_000;
    jest.useFakeTimers();
    jest.setSystemTime(startedAt + 900_000);
    render(
      <PerpsProTwapCard
        twapOrder={buildTwapOrder({
          startedAt,
          status: 'completed',
          elapsedTimeMilliseconds: 600_000,
        })}
      />,
    );
    const elapsed = screen.getByTestId(getDefaultValueTestID(ids.TWAP_ELAPSED));

    // Act
    act(() => {
      jest.advanceTimersByTime(1_000);
    });

    // Assert
    expect(elapsed).toHaveTextContent('00:10:00 / 00:30:00');
  });

  it('caps elapsed at the scheduled duration when the schedule overruns', () => {
    // Arrange: a schedule left open past its runtime must not report more
    // elapsed than total
    const startedAt = 1_700_000_000_000;
    jest.useFakeTimers();
    jest.setSystemTime(startedAt + 3_600_000);

    // Act
    render(<PerpsProTwapCard twapOrder={buildTwapOrder({ startedAt })} />);

    // Assert
    expect(
      screen.getByTestId(getDefaultValueTestID(ids.TWAP_ELAPSED)),
    ).toHaveTextContent('00:30:00 / 00:30:00');
  });

  it('falls back when the venue has reported no average price', () => {
    // Arrange / Act
    render(
      <PerpsProTwapCard
        twapOrder={buildTwapOrder({ averagePrice: undefined })}
      />,
    );

    // Assert
    expect(
      screen.getByTestId(getDefaultValueTestID(ids.TWAP_AVERAGE_PRICE)),
    ).toHaveTextContent(PERPS_CONSTANTS.FallbackPriceDisplay);
  });

  it('marks a buy schedule long and a sell schedule short', () => {
    // Arrange / Act
    const { rerender } = render(
      <PerpsProTwapCard twapOrder={buildTwapOrder({ side: 'buy' })} />,
    );

    // Assert
    expect(
      screen.getByTestId(getDefaultValueTestID(ids.TWAP_DIRECTION_TAG)),
    ).toHaveProp('severity', 'success');
    expect(
      screen.getByTestId(getDefaultValueTestID(ids.TWAP_DIRECTION_TAG)),
    ).toHaveTextContent('Long');

    // Act
    rerender(<PerpsProTwapCard twapOrder={buildTwapOrder({ side: 'sell' })} />);

    // Assert
    expect(
      screen.getByTestId(getDefaultValueTestID(ids.TWAP_DIRECTION_TAG)),
    ).toHaveProp('severity', 'danger');
    expect(
      screen.getByTestId(getDefaultValueTestID(ids.TWAP_DIRECTION_TAG)),
    ).toHaveTextContent('Short');
  });

  it.each([
    ['buy', 'Close short'],
    ['sell', 'Close long'],
  ] as const)('labels a reduce-only %s schedule as %s', (side, label) => {
    // Arrange / Act
    render(
      <PerpsProTwapCard
        twapOrder={buildTwapOrder({ reduceOnly: true, side })}
      />,
    );

    // Assert
    expect(
      screen.getByTestId(getDefaultValueTestID(ids.TWAP_DIRECTION_TAG)),
    ).toHaveTextContent(label);
  });

  it('shows the reduce-only tag only for a reduce-only schedule', () => {
    // Arrange / Act
    const { rerender } = render(
      <PerpsProTwapCard twapOrder={buildTwapOrder({ reduceOnly: false })} />,
    );

    // Assert
    expect(
      screen.queryByTestId(getDefaultValueTestID(ids.TWAP_REDUCE_ONLY_TAG)),
    ).toBeNull();

    // Act
    rerender(
      <PerpsProTwapCard twapOrder={buildTwapOrder({ reduceOnly: true })} />,
    );

    // Assert
    expect(
      screen.getByTestId(getDefaultValueTestID(ids.TWAP_REDUCE_ONLY_TAG)),
    ).toBeOnTheScreen();
  });

  it.each([
    ['active', 'info'],
    ['completed', 'success'],
    ['completed_underfilled', 'warning'],
    ['canceled', 'neutral'],
    ['failed', 'danger'],
  ])('renders %s status with its own severity', (status, severity) => {
    // Arrange / Act
    render(
      <PerpsProTwapCard
        twapOrder={buildTwapOrder({ status: status as TwapOrder['status'] })}
      />,
    );

    // Assert
    expect(
      screen.getByTestId(getDefaultValueTestID(ids.TWAP_STATUS_TAG)),
    ).toHaveProp('severity', severity);
  });

  it('offers Terminate only when a handler is supplied', () => {
    const terminateTestId = getPerpsProTwapTerminateSelector(
      DEFAULT_PROVIDER_ID,
      'twap-1',
    );

    // Arrange / Act
    const { rerender } = render(
      <PerpsProTwapCard twapOrder={buildTwapOrder()} />,
    );

    // Assert: a terminal schedule has nothing to terminate
    expect(screen.queryByTestId(terminateTestId)).toBeNull();

    // Act
    rerender(
      <PerpsProTwapCard twapOrder={buildTwapOrder()} onTerminate={jest.fn()} />,
    );

    // Assert
    expect(screen.getByTestId(terminateTestId)).toBeOnTheScreen();
  });

  it('passes the schedule to the terminate handler', () => {
    // Arrange
    const onTerminate = jest.fn();
    const twapOrder = buildTwapOrder();
    render(
      <PerpsProTwapCard twapOrder={twapOrder} onTerminate={onTerminate} />,
    );

    // Act
    fireEvent.press(
      screen.getByTestId(
        getPerpsProTwapTerminateSelector(
          DEFAULT_PROVIDER_ID,
          twapOrder.orderId,
        ),
      ),
    );

    // Assert
    expect(onTerminate).toHaveBeenCalledWith(twapOrder);
  });

  it('disables Terminate while another termination is in flight', () => {
    // Arrange
    const onTerminate = jest.fn();
    render(
      <PerpsProTwapCard
        twapOrder={buildTwapOrder()}
        onTerminate={onTerminate}
        isTerminateDisabled
      />,
    );

    // Act
    fireEvent.press(
      screen.getByTestId(
        getPerpsProTwapTerminateSelector(DEFAULT_PROVIDER_ID, 'twap-1'),
      ),
    );

    // Assert
    expect(onTerminate).not.toHaveBeenCalled();
  });

  it('targets one schedule when multiple cards can be terminated', () => {
    // Arrange
    const onTerminate = jest.fn();
    const firstOrder = buildTwapOrder({
      orderId: 'shared',
      providerId: 'hyperliquid',
    });
    const secondOrder = buildTwapOrder({
      orderId: 'shared',
      providerId: 'lighter',
      symbol: 'ETH',
    });
    render(
      <>
        <PerpsProTwapCard twapOrder={firstOrder} onTerminate={onTerminate} />
        <PerpsProTwapCard twapOrder={secondOrder} onTerminate={onTerminate} />
      </>,
    );

    // Act
    fireEvent.press(
      screen.getByTestId(
        getPerpsProTwapTerminateSelector('lighter', secondOrder.orderId),
      ),
    );

    // Assert
    expect(onTerminate).toHaveBeenCalledTimes(1);
    expect(onTerminate).toHaveBeenCalledWith(secondOrder);
    expect(
      screen.getByTestId(getPerpsProTwapMarketSelector('BTC')),
    ).toHaveTextContent('BTC');
    expect(
      screen.getByTestId(getPerpsProTwapMarketSelector('ETH')),
    ).toHaveTextContent('ETH');
  });

  it('passes the schedule to the press handler', () => {
    // Arrange
    const onPress = jest.fn();
    const twapOrder = buildTwapOrder();
    render(<PerpsProTwapCard twapOrder={twapOrder} onPress={onPress} />);

    // Act
    fireEvent.press(
      screen.getByTestId(
        getPerpsProTwapValueSelector(
          ids.TWAP_MARKET_BUTTON,
          DEFAULT_PROVIDER_ID,
          twapOrder.orderId,
        ),
      ),
    );

    // Assert
    expect(onPress).toHaveBeenCalledWith(twapOrder);
  });

  it('keeps direction, timestamp, and terminal status in the market action label', () => {
    // Arrange
    const onPress = jest.fn();
    const twapOrder = buildTwapOrder({ status: 'canceled' });
    render(<PerpsProTwapCard twapOrder={twapOrder} onPress={onPress} />);

    // Assert: the actionable header owns the descendants in the accessibility
    // tree, so its label must preserve all meaningful summary context.
    const marketButton = screen.getByTestId(
      getPerpsProTwapValueSelector(
        ids.TWAP_MARKET_BUTTON,
        DEFAULT_PROVIDER_ID,
        twapOrder.orderId,
      ),
    );
    expect(marketButton).toHaveProp(
      'accessibilityLabel',
      expect.stringContaining('Long'),
    );
    expect(marketButton).toHaveProp(
      'accessibilityLabel',
      expect.stringContaining(formatProOrderCardTimestamp(twapOrder.startedAt)),
    );
    expect(marketButton).toHaveProp(
      'accessibilityLabel',
      expect.stringContaining('Terminated'),
    );
  });
});
