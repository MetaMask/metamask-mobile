import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampaignEntriesClosedBanner from './CampaignEntriesClosedBanner';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

describe('CampaignEntriesClosedBanner', () => {
  it('renders the title and description', () => {
    const { getByText } = render(
      <CampaignEntriesClosedBanner
        title="Entries closed"
        description="The deposit window has passed."
      />,
    );

    expect(getByText('Entries closed')).toBeOnTheScreen();
    expect(getByText('The deposit window has passed.')).toBeOnTheScreen();
  });

  it('hides itself when the close button is pressed', () => {
    const { getByTestId, queryByText } = render(
      <CampaignEntriesClosedBanner
        title="Entries closed"
        description="The deposit window has passed."
      />,
    );

    fireEvent.press(getByTestId('campaign-entries-closed-banner-close'));
    expect(queryByText('Entries closed')).toBeNull();
  });
});
