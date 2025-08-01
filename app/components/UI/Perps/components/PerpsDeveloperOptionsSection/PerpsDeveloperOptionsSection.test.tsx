import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PerpsDeveloperOptionsSection } from './PerpsDeveloperOptionsSection';
import { PerpsTestnetToggleSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

describe('PerpsDeveloperOptionsSection', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<PerpsDeveloperOptionsSection />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render the perpetual trading heading', () => {
    const { getByText } = renderWithProvider(<PerpsDeveloperOptionsSection />);
    expect(getByText('Perpetual Trading')).toBeVisible();
  });

  it('should render the PerpsTestnetToggle component', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsDeveloperOptionsSection />,
    );
    expect(getByTestId(PerpsTestnetToggleSelectorsIDs.ROOT)).toBeVisible();
  });
});
