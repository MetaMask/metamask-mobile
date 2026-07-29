import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PerpsMarketAboutSection, {
  PERPS_MARKET_ABOUT_COLLAPSED_LINES,
} from './PerpsMarketAboutSection';
import { PerpsMarketDetailsViewSelectorsIDs } from '../../Perps.testIds';

const LONG_DESCRIPTION =
  'Bitcoin is the first decentralized cryptocurrency. It enables peer-to-peer digital cash without a central authority. Its network is secured by proof-of-work mining and a globally distributed set of nodes.';

describe('PerpsMarketAboutSection', () => {
  it('renders the About title with the asset name and description', () => {
    render(
      <PerpsMarketAboutSection
        assetName="Bitcoin"
        description="Bitcoin is the first cryptocurrency."
      />,
    );

    expect(screen.getByText('About Bitcoin')).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsMarketDetailsViewSelectorsIDs.ABOUT_SECTION),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsMarketDetailsViewSelectorsIDs.ABOUT_DESCRIPTION),
    ).toHaveTextContent('Bitcoin is the first cryptocurrency.');
  });

  it('falls back to a plain About title when assetName is missing', () => {
    render(
      <PerpsMarketAboutSection description="Bitcoin is the first cryptocurrency." />,
    );

    expect(screen.getByText('About')).toBeOnTheScreen();
  });

  it('trims surrounding whitespace from the description', () => {
    render(
      <PerpsMarketAboutSection
        assetName="NVIDIA"
        description="   NVDA is a leading GPU maker.   "
      />,
    );

    expect(
      screen.getByTestId(PerpsMarketDetailsViewSelectorsIDs.ABOUT_DESCRIPTION),
    ).toHaveTextContent('NVDA is a leading GPU maker.');
  });

  it('renders nothing when no description is provided', () => {
    render(<PerpsMarketAboutSection assetName="Bitcoin" />);

    expect(
      screen.queryByTestId(PerpsMarketDetailsViewSelectorsIDs.ABOUT_SECTION),
    ).toBeNull();
    expect(screen.queryByText('About Bitcoin')).toBeNull();
  });

  it('renders nothing when the description is only whitespace', () => {
    render(<PerpsMarketAboutSection assetName="Bitcoin" description="    " />);

    expect(
      screen.queryByTestId(PerpsMarketDetailsViewSelectorsIDs.ABOUT_SECTION),
    ).toBeNull();
  });

  it('supports a custom testID', () => {
    render(
      <PerpsMarketAboutSection
        assetName="Bitcoin"
        description="Some description"
        testID="custom-about"
      />,
    );

    expect(screen.getByTestId('custom-about')).toBeOnTheScreen();
  });

  it('clamps the description to 3 lines while collapsed', () => {
    render(
      <PerpsMarketAboutSection
        assetName="Bitcoin"
        description={LONG_DESCRIPTION}
      />,
    );

    expect(
      screen.getByTestId(PerpsMarketDetailsViewSelectorsIDs.ABOUT_DESCRIPTION)
        .props.numberOfLines,
    ).toBe(PERPS_MARKET_ABOUT_COLLAPSED_LINES);
  });

  it('shows Read more when the description is truncated, then expands and hides it', () => {
    render(
      <PerpsMarketAboutSection
        assetName="Bitcoin"
        description={LONG_DESCRIPTION}
      />,
    );

    const measureText = screen.getByTestId(
      `${PerpsMarketDetailsViewSelectorsIDs.ABOUT_DESCRIPTION}-measure`,
      { includeHiddenElements: true },
    );

    // Unrestricted measure text reports more than 3 natural lines.
    fireEvent(measureText, 'textLayout', {
      nativeEvent: {
        lines: [
          { text: 'line 1' },
          { text: 'line 2' },
          { text: 'line 3' },
          { text: 'line 4' },
        ],
      },
    });

    const readMore = screen.getByTestId(
      PerpsMarketDetailsViewSelectorsIDs.ABOUT_READ_MORE,
    );
    expect(readMore).toBeOnTheScreen();
    expect(screen.getByText('Read more')).toBeOnTheScreen();

    fireEvent.press(readMore);

    expect(
      screen.queryByTestId(PerpsMarketDetailsViewSelectorsIDs.ABOUT_READ_MORE),
    ).toBeNull();
    expect(
      screen.getByTestId(PerpsMarketDetailsViewSelectorsIDs.ABOUT_DESCRIPTION)
        .props.numberOfLines,
    ).toBeUndefined();
  });

  it('does not show Read more when the description fits within 3 lines', () => {
    render(
      <PerpsMarketAboutSection
        assetName="Bitcoin"
        description="Short description."
      />,
    );

    const measureText = screen.getByTestId(
      `${PerpsMarketDetailsViewSelectorsIDs.ABOUT_DESCRIPTION}-measure`,
      { includeHiddenElements: true },
    );

    fireEvent(measureText, 'textLayout', {
      nativeEvent: {
        lines: [{ text: 'Short description.' }],
      },
    });

    expect(
      screen.queryByTestId(PerpsMarketDetailsViewSelectorsIDs.ABOUT_READ_MORE),
    ).toBeNull();
  });
});
