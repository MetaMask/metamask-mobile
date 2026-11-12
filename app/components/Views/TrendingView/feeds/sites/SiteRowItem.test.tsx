import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SiteRowItem } from './SiteRowItem';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../UI/WebsiteIcon', () => () => null);

describe('SiteRowItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the site on the flat browser tab', () => {
    const { getByTestId } = render(
      <SiteRowItem
        site={{
          id: '1',
          name: 'MetaMask',
          url: 'https://metamask.io',
          displayUrl: 'metamask.io',
        }}
      />,
    );

    fireEvent.press(getByTestId('site-row-item-MetaMask'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.BROWSER.HOME,
      expect.objectContaining({
        newTabUrl: 'https://metamask.io',
        fromTrending: true,
        timestamp: expect.any(Number),
      }),
    );
  });
});
