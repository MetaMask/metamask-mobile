import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PerpsMarketData } from '@metamask/perps-controller';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PerpsMarketAboutSectionSelectorsIDs } from '../../Perps.testIds';
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
 * Simulate the native text layout callback so the component can detect that the
 * collapsed description overflows `collapsedNumberOfLines`.
 */
const simulateTruncatedLayout = (fullText: string) => {
  const description = screen.getByTestId(
    PerpsMarketAboutSectionSelectorsIDs.DESCRIPTION,
  );
  // Rendered (clipped) text is shorter than the full description => truncated.
  fireEvent(description, 'textLayout', {
    nativeEvent: {
      lines: [
        { text: fullText.slice(0, 20) },
        { text: fullText.slice(20, 40) },
      ],
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
    expect(screen.getByText('About Bitcoin')).toBeOnTheScreen();
    expect(screen.getByText(LONG_DESCRIPTION)).toBeOnTheScreen();
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

    expect(screen.getByText('About CL')).toBeOnTheScreen();
  });

  describe('read more / show less toggle', () => {
    it('does not render the toggle when the description is not truncated', () => {
      render(<PerpsMarketAboutSection market={createMarket()} />);

      expect(
        screen.queryByTestId(PerpsMarketAboutSectionSelectorsIDs.TOGGLE),
      ).toBeNull();
    });

    it('renders "Read more" when the description overflows, then toggles to "Show less" and back', () => {
      render(<PerpsMarketAboutSection market={createMarket()} />);

      simulateTruncatedLayout(LONG_DESCRIPTION);

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
    it('fires the displayed interaction event with market details', () => {
      render(<PerpsMarketAboutSection market={createMarket()} />);

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          interaction_type: 'market_about_section_displayed',
          market_symbol: 'BTC',
          market_type: 'crypto',
          description_length: LONG_DESCRIPTION.length,
        }),
      );
    });

    it('reports the market_type as hip3 for HIP-3 markets', () => {
      render(
        <PerpsMarketAboutSection
          market={createMarket({ isHip3: true, marketType: 'stock' })}
        />,
      );

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({ market_type: 'hip3' }),
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
