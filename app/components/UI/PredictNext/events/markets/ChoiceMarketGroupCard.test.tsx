import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictMarket,
  PredictMarketStatus,
} from '../../types';
import { ChoiceMarketGroupCard } from './ChoiceMarketGroupCard';
import { ChoiceMarketGroupCardTestIds as TestIds } from './ChoiceMarketGroupCard.testIds';

const GROUP = 'KXNFLRSHYDS-26NOV05JACBAL:rushing_yards:henry';
const TEAM_COLOR = `#${'241773'}`;

const createMarket = ({
  id,
  label,
  displayOrder,
  askPrice = '0.40',
  status = 'active',
}: {
  id: string;
  label: string;
  displayOrder?: number;
  askPrice?: string;
  status?: PredictMarketStatus;
}): PredictMarket => ({
  id: id as PredictEntityId,
  question: `Derrick Henry: ${label}`,
  status,
  group: {
    key: GROUP,
    groupType: 'choice',
    displayOrder,
    label: 'Derrick Henry',
  },
  outcomes: [
    {
      id: `${id}:yes` as PredictEntityId,
      side: 'yes',
      label,
      askPrice: askPrice as PredictDecimal,
    },
    { id: `${id}:no` as PredictEntityId, side: 'no', label },
  ],
});

const sixty = createMarket({
  id: 'henry-60',
  label: '60+ yards',
  displayOrder: 1,
});
const forty = createMarket({
  id: 'henry-40',
  label: '40+ yards',
  displayOrder: 0,
});

const describeRow = (
  _market: PredictMarket,
  yes: PredictMarket['outcomes'][0],
) => ({
  label: yes.label,
  color: TEAM_COLOR,
});

describe('ChoiceMarketGroupCard', () => {
  it('shows the title and one row per Market in display order', () => {
    render(
      <ChoiceMarketGroupCard
        groupKey={GROUP}
        markets={[sixty, forty]}
        title="Derrick Henry"
        describeRow={describeRow}
      />,
    );

    expect(screen.getByTestId(TestIds.title(GROUP))).toHaveTextContent(
      'Derrick Henry',
    );
    expect(
      screen
        .getAllByTestId(new RegExp(`^${TestIds.row(GROUP, '')}henry-\\d+$`))
        .map((row) => row.props.testID),
    ).toEqual([TestIds.row(GROUP, 'henry-40'), TestIds.row(GROUP, 'henry-60')]);
    expect(
      screen.getByTestId(TestIds.row(GROUP, 'henry-40')),
    ).toHaveTextContent(/40\+ yards.*40¢/);
  });

  it('has no title without one', () => {
    render(
      <ChoiceMarketGroupCard
        groupKey={GROUP}
        markets={[forty]}
        describeRow={describeRow}
      />,
    );

    expect(screen.queryByTestId(TestIds.title(GROUP))).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(TestIds.row(GROUP, 'henry-40')),
    ).toBeOnTheScreen();
  });

  it('colors each row and shows its leading element', () => {
    render(
      <ChoiceMarketGroupCard
        groupKey={GROUP}
        markets={[forty]}
        describeRow={() => ({
          label: 'Row',
          color: TEAM_COLOR,
          leading: <Text testID="leading">avatar</Text>,
        })}
      />,
    );

    expect(screen.getByTestId('leading')).toBeOnTheScreen();
    expect(screen.getByTestId(TestIds.line(GROUP, 'henry-40'))).toHaveStyle({
      backgroundColor: TEAM_COLOR,
    });
  });

  it('orders a row by its yes side and disables a closed one', () => {
    const onOrder = jest.fn();
    const closed = createMarket({
      id: 'henry-80',
      label: '80+ yards',
      displayOrder: 2,
      status: 'closed',
    });
    render(
      <ChoiceMarketGroupCard
        groupKey={GROUP}
        markets={[forty, closed]}
        describeRow={describeRow}
        onOrder={onOrder}
      />,
    );

    fireEvent.press(screen.getByTestId(TestIds.price(GROUP, 'henry-40')));
    fireEvent.press(screen.getByTestId(TestIds.price(GROUP, 'henry-80')));

    expect(onOrder.mock.calls).toEqual([[forty, forty.outcomes[0]]]);
  });

  it('renders nothing without a Market that has a yes side', () => {
    render(
      <ChoiceMarketGroupCard
        groupKey={GROUP}
        markets={[]}
        describeRow={describeRow}
      />,
    );

    expect(screen.queryByTestId(TestIds.card(GROUP))).not.toBeOnTheScreen();
  });
});
