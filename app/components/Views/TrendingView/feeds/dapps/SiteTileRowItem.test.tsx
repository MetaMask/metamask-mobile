import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import SiteTileRowItem from './SiteTileRowItem';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../UI/WebsiteIcon', () => () => null);

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      card: {},
      websiteIcon: {},
    },
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

describe('SiteTileRowItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the site in the browser tab', () => {
    const { getByTestId } = render(
      <SiteTileRowItem
        site={{
          id: '1',
          name: 'Uniswap',
          url: 'https://uniswap.org',
          displayUrl: 'uniswap.org',
        }}
      />,
    );

    fireEvent.press(getByTestId('site-recents-tile-Uniswap'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.BROWSER.HOME,
      expect.objectContaining({
        newTabUrl: 'https://uniswap.org',
        fromTrending: true,
        timestamp: expect.any(Number),
      }),
    );
  });
});
