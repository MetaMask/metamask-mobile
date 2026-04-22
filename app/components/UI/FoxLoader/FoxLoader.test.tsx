import React from 'react';
import { render, screen } from '@testing-library/react-native';
import FoxLoader from './FoxLoader';
import { FoxLoaderSelectorsIDs } from './FoxLoader.testIds';

describe('FoxLoader', () => {
  it('renders correctly', () => {
    render(<FoxLoader />);
    expect(
      screen.getByTestId(FoxLoaderSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });
});
