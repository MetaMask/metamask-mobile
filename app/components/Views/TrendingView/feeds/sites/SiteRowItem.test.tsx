import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import type { SiteData } from '../../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import { SiteRowItem } from './SiteRowItem';

jest.mock('../../../../UI/WebsiteIcon', () => jest.fn(() => null));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const site: SiteData = {
  id: 'site-1',
  name: 'Uniswap',
  url: 'https://app.uniswap.org',
  displayUrl: 'app.uniswap.org',
};

describe('SiteRowItem (Explore feed)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the site in a browser tab tagged with the entry point', () => {
    const { getByTestId } = render(
      <SiteRowItem site={site} entryPoint="explore_search" />,
    );

    fireEvent.press(getByTestId('site-row-item-Uniswap'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: expect.objectContaining({
        newTabUrl: 'https://app.uniswap.org',
        fromTrending: true,
        entryPoint: 'explore_search',
      }),
    });
  });

  it('does not tag the tab when no entry point is given', () => {
    const { getByTestId } = render(<SiteRowItem site={site} />);

    fireEvent.press(getByTestId('site-row-item-Uniswap'));

    const [, { params }] = mockNavigate.mock.calls[0];
    expect(params).not.toHaveProperty('entryPoint');
  });
});
