import { screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WinRateTag, { WIN_RATE_TAG_TROPHY_TEST_ID } from './WinRateTag';

const TEST_ID = 'win-rate-tag';

describe('WinRateTag', () => {
  it('renders the win rate as a whole percent with the WR suffix', () => {
    renderWithProvider(<WinRateTag winRatePercent={92} testID={TEST_ID} />);

    expect(screen.getByTestId(TEST_ID)).toHaveTextContent('92% WR');
  });

  it('rounds a fractional win rate to a whole percent', () => {
    renderWithProvider(<WinRateTag winRatePercent={61.4} testID={TEST_ID} />);

    expect(screen.getByTestId(TEST_ID)).toHaveTextContent('61% WR');
  });

  it('renders nothing when the win rate is null', () => {
    renderWithProvider(<WinRateTag winRatePercent={null} testID={TEST_ID} />);

    expect(screen.queryByTestId(TEST_ID)).not.toBeOnTheScreen();
  });

  // The field is absent on some payloads; an undefined win rate must drop the
  // badge rather than render the em-dash `formatPercent` falls back to.
  it('renders nothing when the win rate is undefined', () => {
    renderWithProvider(<WinRateTag testID={TEST_ID} />);

    expect(screen.queryByTestId(TEST_ID)).not.toBeOnTheScreen();
  });

  it('renders the trophy at the elite threshold', () => {
    renderWithProvider(<WinRateTag winRatePercent={90} testID={TEST_ID} />);

    expect(screen.getByTestId(WIN_RATE_TAG_TROPHY_TEST_ID)).toBeOnTheScreen();
  });

  it('omits the trophy just below the elite threshold', () => {
    renderWithProvider(<WinRateTag winRatePercent={89} testID={TEST_ID} />);

    expect(screen.getByTestId(TEST_ID)).toHaveTextContent('89% WR');
    expect(
      screen.queryByTestId(WIN_RATE_TAG_TROPHY_TEST_ID),
    ).not.toBeOnTheScreen();
  });
});
