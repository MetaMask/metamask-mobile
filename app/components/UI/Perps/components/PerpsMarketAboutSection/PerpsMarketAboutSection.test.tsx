import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  PERPS_EVENT_PROPERTY,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PerpsMarketAboutSectionSelectorsIDs } from '../../Perps.testIds';
import {
  MARKET_ABOUT_EVENT_PROPERTY,
  MARKET_ABOUT_INTERACTION_TYPE,
} from '../../utils/marketAbout';
import PerpsMarketAboutSection from './PerpsMarketAboutSection';

const mockTrack = jest.fn();

// Mock the declarative event-tracking hook so we can assert the "displayed"
// event fires with the right properties when the section renders.
jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: (options?: {
    eventName: string;
    conditions?: boolean[];
    properties?: Record<string, unknown>;
  }) => {
    if (options && (!options.conditions || options.conditions.every(Boolean))) {
      mockTrack(options.eventName, options.properties);
    }
    return { track: mockTrack };
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    if (key === 'perps.market.about') {
      return `About ${params?.name ?? ''}`;
    }
    if (key === 'perps.market.about_read_more') {
      return 'Read more';
    }
    if (key === 'perps.market.about_show_less') {
      return 'Show less';
    }
    return key;
  },
}));

const LONG_DESCRIPTION =
  "The world's first cryptocurrency, Bitcoin is stored and exchanged securely on the internet through a digital ledger known as a blockchain. Bitcoins are divisible into smaller units known as satoshis.";

const createMarket = (
  overrides: Partial<PerpsMarketData> = {},
): PerpsMarketData =>
  ({
    symbol: 'BTC',
    name: 'Bitcoin',
    description: LONG_DESCRIPTION,
    marketType: 'crypto',
    ...overrides,
  }) as PerpsMarketData;

/**
 * Simulate the native text layout callback on the off-screen measurer with a
 * given rendered line count so the component can decide whether it overflows
 * the collapsed clamp.
 */
const simulateMeasuredLines = (lineCount: number) => {
  // The measurer is intentionally hidden from accessibility, so opt into
  // hidden elements when querying it.
  const measurer = screen.getByTestId(
    PerpsMarketAboutSectionSelectorsIDs.DESCRIPTION_MEASURE,
    { includeHiddenElements: true },
  );
  fireEvent(measurer, 'textLayout', {
    nativeEvent: {
      lines: Array.from({ length: lineCount }, (_, i) => ({
        text: `line ${i}`,
      })),
    },
  });
};

describe('PerpsMarketAboutSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and description when a description is present', () => {
    render(<PerpsMarketAboutSection market={createMarket()} />);

    expect(
      screen.getByTestId(PerpsMarketAboutSectionSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsMarketAboutSectionSelectorsIDs.TITLE),
    ).toHaveTextContent('About Bitcoin');
    expect(
      screen.getByTestId(PerpsMarketAboutSectionSelectorsIDs.DESCRIPTION),
    ).toHaveTextContent(LONG_DESCRIPTION);
  });

  it('renders nothing when the description is missing', () => {
    render(
      <PerpsMarketAboutSection
        market={createMarket({ description: undefined })}
      />,
    );

    expect(
      screen.queryByTestId(PerpsMarketAboutSectionSelectorsIDs.CONTAINER),
    ).toBeNull();
  });

  it('renders nothing when the description is only whitespace', () => {
    render(
      <PerpsMarketAboutSection market={createMarket({ description: '   ' })} />,
    );

    expect(
      screen.queryByTestId(PerpsMarketAboutSectionSelectorsIDs.CONTAINER),
    ).toBeNull();
  });

  it('falls back to the symbol in the title when the name is missing', () => {
    render(
      <PerpsMarketAboutSection
        market={createMarket({ name: '', symbol: 'CL' })}
      />,
    );

    expect(
      screen.getByTestId(PerpsMarketAboutSectionSelectorsIDs.TITLE),
    ).toHaveTextContent('About CL');
  });

  describe('read more / show less toggle', () => {
    it('does not render the toggle when the description fits within the clamp', () => {
      render(<PerpsMarketAboutSection market={createMarket()} />);

      // Measured line count is within the default 3-line clamp.
      simulateMeasuredLines(2);

      expect(
        screen.queryByTestId(PerpsMarketAboutSectionSelectorsIDs.TOGGLE),
      ).toBeNull();
    });

    it('does not render the toggle before the description is measured', () => {
      render(<PerpsMarketAboutSection market={createMarket()} />);

      expect(
        screen.queryByTestId(PerpsMarketAboutSectionSelectorsIDs.TOGGLE),
      ).toBeNull();
    });

    it('renders "Read more" when the description overflows, then toggles to "Show less" and back', () => {
      render(<PerpsMarketAboutSection market={createMarket()} />);

      // Measured line count exceeds the default 3-line clamp.
      simulateMeasuredLines(5);

      const toggle = screen.getByTestId(
        PerpsMarketAboutSectionSelectorsIDs.TOGGLE,
      );
      expect(screen.getByText('Read more')).toBeOnTheScreen();

      fireEvent.press(toggle);
      expect(screen.getByText('Show less')).toBeOnTheScreen();

      fireEvent.press(toggle);
      expect(screen.getByText('Read more')).toBeOnTheScreen();
    });
  });

  describe('analytics', () => {
    it('fires the displayed interaction event with canonical property keys', () => {
      render(<PerpsMarketAboutSection market={createMarket()} />);

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            MARKET_ABOUT_INTERACTION_TYPE.DISPLAYED,
          [PERPS_EVENT_PROPERTY.ASSET]: 'BTC',
          [PERPS_EVENT_PROPERTY.MARKET_CATEGORY]: 'crypto',
          [MARKET_ABOUT_EVENT_PROPERTY.DESCRIPTION_LENGTH]:
            LONG_DESCRIPTION.length,
        }),
      );
    });

    it('re-fires the displayed event with the new asset when the market changes', () => {
      const { rerender } = render(
        <PerpsMarketAboutSection market={createMarket()} />,
      );

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({ [PERPS_EVENT_PROPERTY.ASSET]: 'BTC' }),
      );

      mockTrack.mockClear();

      rerender(
        <PerpsMarketAboutSection
          market={createMarket({ symbol: 'ETH', name: 'Ethereum' })}
        />,
      );

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({ [PERPS_EVENT_PROPERTY.ASSET]: 'ETH' }),
      );
    });

    it('reports the market_category as hip3 for HIP-3 markets', () => {
      render(
        <PerpsMarketAboutSection
          market={createMarket({ isHip3: true, marketType: 'stock' })}
        />,
      );

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.MARKET_CATEGORY]: 'hip3',
        }),
      );
    });

    it('does not fire the displayed event when there is no description', () => {
      render(
        <PerpsMarketAboutSection
          market={createMarket({ description: undefined })}
        />,
      );

      expect(mockTrack).not.toHaveBeenCalled();
    });
  });
});
