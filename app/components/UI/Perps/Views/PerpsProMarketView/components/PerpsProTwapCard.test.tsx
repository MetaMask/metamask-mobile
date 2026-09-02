import { fireEvent, render, screen } from '@testing-library/react-native';
import type { TwapOrder } from '@metamask/perps-controller';
import React from 'react';
import { useSelector } from 'react-redux';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
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
const DOTS_SHORT = '•'.repeat(6);

describe('PerpsProTwapCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useSelector).mockReturnValue(false);
  });

  it('renders the schedule market and size', () => {
    // Arrange / Act
    render(<PerpsProTwapCard twapOrder={buildTwapOrder()} />);

    // Assert
    expect(screen.getByTestId(ids.TWAP_MARKET)).toHaveTextContent('BTC');
    expect(screen.getByTestId(ids.TWAP_SIZE)).toHaveTextContent('10 BTC');
  });

  it('hides total and filled sizes in privacy mode', () => {
    // Arrange
    jest.mocked(useSelector).mockReturnValue(true);

    // Act
    render(<PerpsProTwapCard twapOrder={buildTwapOrder()} />);

    // Assert
    expect(screen.queryByText('10 BTC')).toBeNull();
    expect(screen.queryByText('4 BTC')).toBeNull();
    expect(screen.getByTestId(ids.TWAP_SIZE)).toHaveTextContent(DOTS_SHORT);
    expect(screen.getByTestId(ids.TWAP_FILLED_SIZE)).toHaveTextContent(
      DOTS_SHORT,
    );
  });

  it('shows fill progress as a whole percent', () => {
    // Arrange / Act
    render(
      <PerpsProTwapCard
        twapOrder={buildTwapOrder({ fillProgressBps: 2500 })}
      />,
    );

    // Assert
    expect(screen.getByTestId(ids.TWAP_PROGRESS)).toHaveTextContent('25%');
  });

  it('renders elapsed against total duration', () => {
    // Arrange / Act
    render(<PerpsProTwapCard twapOrder={buildTwapOrder()} />);

    // Assert: 600_000ms elapsed is 10 minutes of a 30 minute schedule
    expect(screen.getByTestId(ids.TWAP_ELAPSED)).toHaveTextContent(
      '10 minutes / 30 minutes',
    );
  });

  it('renders zero elapsed rather than a bare separator', () => {
    // Arrange / Act
    render(
      <PerpsProTwapCard
        twapOrder={buildTwapOrder({ elapsedTimeMilliseconds: 0 })}
      />,
    );

    // Assert
    expect(screen.getByTestId(ids.TWAP_ELAPSED)).toHaveTextContent(
      '0 minutes / 30 minutes',
    );
  });

  it('falls back when the venue has reported no average price', () => {
    // Arrange / Act
    render(
      <PerpsProTwapCard
        twapOrder={buildTwapOrder({ averagePrice: undefined })}
      />,
    );

    // Assert
    expect(screen.getByTestId(ids.TWAP_AVERAGE_PRICE)).toBeOnTheScreen();
  });

  it('marks a buy schedule long and a sell schedule short', () => {
    // Arrange / Act
    const { rerender } = render(
      <PerpsProTwapCard twapOrder={buildTwapOrder({ side: 'buy' })} />,
    );

    // Assert
    expect(screen.getByTestId(ids.TWAP_DIRECTION_TAG)).toHaveProp(
      'severity',
      'success',
    );

    // Act
    rerender(<PerpsProTwapCard twapOrder={buildTwapOrder({ side: 'sell' })} />);

    // Assert
    expect(screen.getByTestId(ids.TWAP_DIRECTION_TAG)).toHaveProp(
      'severity',
      'danger',
    );
  });

  it('shows the reduce-only tag only for a reduce-only schedule', () => {
    // Arrange / Act
    const { rerender } = render(
      <PerpsProTwapCard twapOrder={buildTwapOrder({ reduceOnly: false })} />,
    );

    // Assert
    expect(screen.queryByTestId(ids.TWAP_REDUCE_ONLY_TAG)).toBeNull();

    // Act
    rerender(
      <PerpsProTwapCard twapOrder={buildTwapOrder({ reduceOnly: true })} />,
    );

    // Assert
    expect(screen.getByTestId(ids.TWAP_REDUCE_ONLY_TAG)).toBeOnTheScreen();
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
    expect(screen.getByTestId(ids.TWAP_STATUS_TAG)).toHaveProp(
      'severity',
      severity,
    );
  });

  it('offers Terminate only when a handler is supplied', () => {
    // Arrange / Act
    const { rerender } = render(
      <PerpsProTwapCard twapOrder={buildTwapOrder()} />,
    );

    // Assert: a terminal schedule has nothing to terminate
    expect(screen.queryByTestId(ids.TWAP_TERMINATE)).toBeNull();

    // Act
    rerender(
      <PerpsProTwapCard twapOrder={buildTwapOrder()} onTerminate={jest.fn()} />,
    );

    // Assert
    expect(screen.getByTestId(ids.TWAP_TERMINATE)).toBeOnTheScreen();
  });

  it('passes the schedule to the terminate handler', () => {
    // Arrange
    const onTerminate = jest.fn();
    const twapOrder = buildTwapOrder();
    render(
      <PerpsProTwapCard twapOrder={twapOrder} onTerminate={onTerminate} />,
    );

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_TERMINATE));

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
    fireEvent.press(screen.getByTestId(ids.TWAP_TERMINATE));

    // Assert
    expect(onTerminate).not.toHaveBeenCalled();
  });

  it('passes the schedule to the press handler', () => {
    // Arrange
    const onPress = jest.fn();
    const twapOrder = buildTwapOrder();
    render(<PerpsProTwapCard twapOrder={twapOrder} onPress={onPress} />);

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_ROW));

    // Assert
    expect(onPress).toHaveBeenCalledWith(twapOrder);
  });
});
