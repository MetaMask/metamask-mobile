import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LockScreen from './';
import { FoxLoaderSelectorsIDs } from '../../UI/FoxLoader/FoxLoader.testIds';

describe('LockScreen', () => {
  it('should render correctly', () => {
    render(<LockScreen />);
    expect(
      screen.getByTestId(FoxLoaderSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });
});
