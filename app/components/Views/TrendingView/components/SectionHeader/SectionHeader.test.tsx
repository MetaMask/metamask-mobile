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

  it('renders title for predictions section', () => {
    const { getByText } = renderWithProvider(
      <SectionHeader sectionId="predictions" />,
      { state: initialState },
    );

    expect(getByText('Predictions')).toBeOnTheScreen();
  });

  it('renders title for tokens section', () => {
    const { getByText } = renderWithProvider(
      <SectionHeader sectionId="tokens" />,
      { state: initialState },
    );

    expect(getByText('Trending tokens')).toBeOnTheScreen();
  });

  it('renders title for perps section', () => {
    const { getByText } = renderWithProvider(
      <SectionHeader sectionId="perps" />,
      { state: initialState },
    );

    expect(getByText('Perps')).toBeOnTheScreen();
  });

  it('calls navigation action when header is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <SectionHeader sectionId="perps" />,
      { state: initialState },
    );

    fireEvent.press(getByTestId('section-header-view-all-perps'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});
