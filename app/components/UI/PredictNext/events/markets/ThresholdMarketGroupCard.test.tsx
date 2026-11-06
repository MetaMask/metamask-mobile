import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictMarket,
} from '../../types';
import { MarketGroupCardTestIds as TestIds } from './MarketGroupCard.testIds';
import { ThresholdMarketGroupCard } from './ThresholdMarketGroupCard';

const GROUP = 'KXNFLRSHYDS-26NOV02CHISEA:rushing_yards:player-1';

const line = (
  value: number,
  yesAsk: string,
  noAsk: string,
  label?: string,
): PredictMarket => ({
  id: `LINE${value}` as PredictEntityId,
  question: `Josh Jacobs: ${value}+ rushing yards?`,
  status: 'active',
  group: {
    key: GROUP,
    groupType: 'marketSelector',
    marketType: 'threshold',
    option: { type: 'number', value },
    label,
  },
  outcomes: [
    {
      id: `LINE${value}:yes` as PredictEntityId,
      side: 'yes',
      label: 'Yes',
      askPrice: yesAsk as PredictDecimal,
    },
    {
      id: `LINE${value}:no` as PredictEntityId,
      side: 'no',
      label: 'No',
      askPrice: noAsk as PredictDecimal,
    },
  ],
});

const line60 = line(60, '0.62', '0.40', 'Josh Jacobs');
const line80 = line(80, '0.31', '0.71', 'Josh Jacobs');

const renderCard = (
  props: Partial<React.ComponentProps<typeof ThresholdMarketGroupCard>> = {},
) => {
  const handlers = {
    onSelectMarket: jest.fn(),
    onOrder: jest.fn(),
    onRulesPress: jest.fn(),
  };
  render(
    <ThresholdMarketGroupCard
      groupKey={GROUP}
      markets={[line60, line80]}
      selectedMarket={line60}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
};

describe('ThresholdMarketGroupCard', () => {
  it('titles the card with its label and the selected line', () => {
    renderCard();

    expect(screen.getByTestId(TestIds.title(GROUP))).toHaveTextContent(
      'Josh Jacobs: 60+',
    );
  });

  it('titles an unlabelled card with the line alone', () => {
    const unlabelled = line(60, '0.62', '0.40');
    renderCard({ markets: [unlabelled], selectedMarket: unlabelled });

    expect(screen.getByTestId(TestIds.title(GROUP))).toHaveTextContent('60+');
  });

  it("shows the selected line's chance and its Yes and No prices", () => {
    renderCard({ selectedMarket: line80 });

    expect(screen.getByTestId(TestIds.title(GROUP))).toHaveTextContent(
      'Josh Jacobs: 80+',
    );
    expect(screen.getByTestId(TestIds.percentage(GROUP))).toHaveTextContent(
      '31%',
    );
    expect(
      screen.getByTestId(TestIds.outcomeButton(GROUP, line80.id, 'yes')),
    ).toHaveTextContent('Yes · 31¢');
    expect(
      screen.getByTestId(TestIds.outcomeButton(GROUP, line80.id, 'no')),
    ).toHaveTextContent('No · 71¢');
  });

  it('orders the Outcome of the selected line', () => {
    const { onOrder } = renderCard();

    fireEvent.press(
      screen.getByTestId(TestIds.outcomeButton(GROUP, line60.id, 'yes')),
    );
    fireEvent.press(
      screen.getByTestId(TestIds.outcomeButton(GROUP, line60.id, 'no')),
    );

    expect(onOrder).toHaveBeenNthCalledWith(1, line60, line60.outcomes[0]);
    expect(onOrder).toHaveBeenNthCalledWith(2, line60, line60.outcomes[1]);
  });

  it('lists the lines as "N+" and selects one when pressed', () => {
    const { onSelectMarket } = renderCard();

    expect(
      screen.getByTestId(TestIds.option(GROUP, line60.id)),
    ).toHaveTextContent('60+');
    fireEvent.press(screen.getByTestId(TestIds.option(GROUP, line80.id)));

    expect(onSelectMarket).toHaveBeenCalledWith(line80.id);
  });

  it('names each picker row by its label, line and Yes price', () => {
    renderCard();

    expect(screen.getByTestId(TestIds.option(GROUP, line80.id))).toHaveProp(
      'accessibilityLabel',
      'Josh Jacobs, 80 or more, Yes 31¢',
    );
  });

  it('names an unlabelled picker row by its line and Yes price', () => {
    const unlabelled60 = line(60, '0.62', '0.40');
    const unlabelled80 = line(80, '0.31', '0.71');
    renderCard({
      markets: [unlabelled60, unlabelled80],
      selectedMarket: unlabelled60,
    });

    expect(
      screen.getByTestId(TestIds.option(GROUP, unlabelled80.id)),
    ).toHaveProp('accessibilityLabel', '80 or more, Yes 31¢');
  });

  it('has no picker for a single line', () => {
    renderCard({ markets: [line60] });

    expect(screen.queryByTestId(TestIds.selector(GROUP))).not.toBeOnTheScreen();
  });

  it('shows the rules button only when the line has rules', () => {
    const withRules = { ...line60, rules: 'Resolves on official stats.' };
    const { onRulesPress } = renderCard({
      markets: [withRules, line80],
      selectedMarket: withRules,
    });

    fireEvent.press(screen.getByTestId(TestIds.rulesButton(GROUP)));
    expect(onRulesPress).toHaveBeenCalledWith(withRules);

    screen.rerender(
      <ThresholdMarketGroupCard
        groupKey={GROUP}
        markets={[line60, line80]}
        selectedMarket={line60}
        onSelectMarket={jest.fn()}
        onRulesPress={onRulesPress}
      />,
    );
    expect(
      screen.queryByTestId(TestIds.rulesButton(GROUP)),
    ).not.toBeOnTheScreen();
  });
});
