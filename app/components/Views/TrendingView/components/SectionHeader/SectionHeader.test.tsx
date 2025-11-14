import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import SectionHeader from './SectionHeader';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('SectionHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and view all text for predictions section', () => {
    const { getByText } = renderWithProvider(
      <SectionHeader sectionId="predictions" />,
      { state: initialState },
    );

    expect(getByText('Predictions')).toBeOnTheScreen();
    expect(getByText('View all')).toBeOnTheScreen();
  });

  it('renders title and view all text for tokens section', () => {
    const { getByText } = renderWithProvider(
      <SectionHeader sectionId="tokens" />,
      { state: initialState },
    );

    expect(getByText('Tokens')).toBeOnTheScreen();
    expect(getByText('View all')).toBeOnTheScreen();
  });

  it('renders title and view all text for perps section', () => {
    const { getByText } = renderWithProvider(
      <SectionHeader sectionId="perps" />,
      { state: initialState },
    );

    expect(getByText('Perps')).toBeOnTheScreen();
    expect(getByText('View all')).toBeOnTheScreen();
  });

  it('calls navigation action when view all button is pressed', () => {
    const { getByText } = renderWithProvider(
      <SectionHeader sectionId="perps" />,
      { state: initialState },
    );

    fireEvent.press(getByText('View all'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});
