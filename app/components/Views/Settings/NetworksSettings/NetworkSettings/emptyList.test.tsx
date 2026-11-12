import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import EmptyPopularList from './emptyList';
import Routes from '../../../../../constants/navigation/Routes';
import { CHAINLIST_URL } from '../../../../../constants/urls';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { default: 'white' },
      text: { default: 'black' },
      primary: { default: 'blue' },
    },
  }),
}));

describe('EmptyPopularList', () => {
  it('opens chainlist on the flat browser tab', () => {
    const { getByText } = render(
      <EmptyPopularList goToCustomNetwork={jest.fn()} />,
    );

    fireEvent.press(getByText(/networks.add_other_network_here/));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.BROWSER.HOME,
      expect.objectContaining({ newTabUrl: CHAINLIST_URL }),
    );
  });
});
