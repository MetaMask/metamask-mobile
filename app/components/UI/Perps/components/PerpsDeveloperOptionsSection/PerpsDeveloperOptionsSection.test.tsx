import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PerpsDeveloperOptionsSection } from './PerpsDeveloperOptionsSection';
import { PerpsTestnetToggleSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

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
