import React from 'react';
import { Linking } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import type {
  PredictEntityId,
  PredictHttpsUrl,
  PredictMarket,
  PredictSettlementSource,
} from '../../../types';
import RulesBottomSheet from './RulesBottomSheet';
import { RulesBottomSheetTestIds } from './RulesBottomSheet.testIds';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
}));

const market: Pick<PredictMarket, 'id' | 'question' | 'rules'> = {
  id: 'market-1' as PredictEntityId,
  question: 'Will the team win?',
  rules: 'Market rule.',
};

const renderRulesSheet = (
  overrides: Partial<React.ComponentProps<typeof RulesBottomSheet>> = {},
) => render(<RulesBottomSheet isVisible onClose={jest.fn()} {...overrides} />);

describe('RulesBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Event-only rules', () => {
    renderRulesSheet({ eventRules: 'Event rule.' });

    expect(
      screen.getByTestId(RulesBottomSheetTestIds.EVENT_RULES),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(RulesBottomSheetTestIds.MARKET_RULES),
    ).not.toBeOnTheScreen();
  });

  it('renders Market-only rules with the Market question', () => {
    renderRulesSheet({ market });

    expect(
      screen.getByTestId(RulesBottomSheetTestIds.MARKET_RULES),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(RulesBottomSheetTestIds.MARKET_QUESTION),
    ).toHaveTextContent('Will the team win?');
  });

  it('renders different Event and Market rules', () => {
    renderRulesSheet({ eventRules: 'Event rule.', market });

    expect(
      screen.getByTestId(RulesBottomSheetTestIds.EVENT_RULES),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(RulesBottomSheetTestIds.MARKET_RULES),
    ).toBeOnTheScreen();
  });

  it('renders identical Event and Market rules once', () => {
    renderRulesSheet({
      eventRules: ' Shared rule. ',
      market: { ...market, rules: 'Shared rule.' },
    });

    expect(
      screen.getByTestId(RulesBottomSheetTestIds.EVENT_RULES),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(RulesBottomSheetTestIds.MARKET_RULES),
    ).not.toBeOnTheScreen();
  });

  it('omits the sheet when it is not visible', () => {
    renderRulesSheet({ isVisible: false, eventRules: 'Event rule.' });

    expect(
      screen.queryByTestId(RulesBottomSheetTestIds.SHEET),
    ).not.toBeOnTheScreen();
  });

  it('opens the selected settlement source URL', () => {
    const settlementSources: PredictSettlementSource[] = [
      {
        name: 'ESPN',
        url: 'https://www.espn.com/' as PredictHttpsUrl,
      },
      {
        name: 'Reuters',
        url: 'https://www.reuters.com/' as PredictHttpsUrl,
      },
      {
        name: 'League',
        url: 'https://www.example.com/' as PredictHttpsUrl,
      },
    ];

    renderRulesSheet({
      eventRules: 'Event rule.',
      settlementSources,
    });

    fireEvent.press(screen.getByTestId(RulesBottomSheetTestIds.SOURCE_LINK(1)));

    expect(Linking.openURL).toHaveBeenCalledWith('https://www.reuters.com/');
    expect(
      screen.getByTestId(RulesBottomSheetTestIds.SOURCES),
    ).toHaveTextContent('Outcome verified from ESPN, Reuters and League.');
  });

  it('ignores settlement source URL failures', async () => {
    const openURL = Linking.openURL as jest.MockedFunction<
      typeof Linking.openURL
    >;
    openURL.mockRejectedValueOnce(new Error('browser unavailable'));

    renderRulesSheet({
      eventRules: 'Event rule.',
      settlementSources: [
        {
          name: 'ESPN',
          url: 'https://www.espn.com/' as PredictHttpsUrl,
        },
      ],
    });

    fireEvent.press(screen.getByTestId(RulesBottomSheetTestIds.SOURCE_LINK(0)));

    await waitFor(() =>
      expect(openURL).toHaveBeenCalledWith('https://www.espn.com/'),
    );
  });

  it('closes the sheet through the header control', async () => {
    const onClose = jest.fn();
    renderRulesSheet({ eventRules: 'Event rule.', onClose });

    fireEvent.press(screen.getByTestId(RulesBottomSheetTestIds.CLOSE_BUTTON));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
