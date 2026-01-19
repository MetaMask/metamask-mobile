import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PerpsDeveloperOptionsSection } from './PerpsDeveloperOptionsSection';
import { PerpsTestnetToggleSelectorsIDs } from '../../Perps.testIds';

// Mock navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

describe('PerpsDeveloperOptionsSection', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(<PerpsDeveloperOptionsSection />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders the perpetual trading heading', () => {
    const { getByText } = renderWithProvider(<PerpsDeveloperOptionsSection />);
    expect(getByText('Perps Trading')).toBeVisible();
  });

  it('renders the PerpsTestnetToggle component', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsDeveloperOptionsSection />,
    );
    expect(getByTestId(PerpsTestnetToggleSelectorsIDs.ROOT)).toBeVisible();
  });
});
