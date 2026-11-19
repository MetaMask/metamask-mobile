import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { CollectiblesPackScreen } from './CollectiblesPackScreen';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { packCode: 'pack-1' } }),
}));

describe('CollectiblesPackScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('shows the placeholder title and the pack code from the route', () => {
    render(<CollectiblesPackScreen />);

    expect(
      screen.getByText(strings('collectibles.placeholder.pack')),
    ).toBeOnTheScreen();
    expect(screen.getByText('pack-1')).toBeOnTheScreen();
  });

  it('goes back when the back button is pressed', () => {
    render(<CollectiblesPackScreen />);

    fireEvent.press(screen.getByTestId('button-icon'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
