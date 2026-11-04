import React from 'react';
import { renderScreen } from '../../../util/test/renderWithProvider';
import CollectiblesSectionScreen from './CollectiblesView';
import {
  enterCollectiblesSection,
  exitContextualSection,
} from '../../Nav/Main/contextualNav/contextualSection';

jest.mock('../../hooks/useIsGlassSurfaceEnabled', () => ({
  useIsGlassSurfaceEnabled: () => false,
}));

jest.mock('../../../selectors/featureFlagController/moneyBrandRefresh', () => ({
  selectMoneyBrandRefreshEnabled: () => false,
}));

describe('CollectiblesView', () => {
  afterEach(() => {
    exitContextualSection();
  });

  it('shows a Collectibles header and a centered placeholder', () => {
    enterCollectiblesSection();

    const { getByText } = renderScreen(
      CollectiblesSectionScreen,
      { name: 'CollectiblesView' },
      { state: {} },
    );

    expect(getByText('Collectibles')).toBeOnTheScreen();
    expect(getByText('Placeholder')).toBeOnTheScreen();
    expect(getByText('Popular')).toBeOnTheScreen();
    expect(getByText('Packs')).toBeOnTheScreen();
    expect(getByText('Collection')).toBeOnTheScreen();
    expect(getByText('Market')).toBeOnTheScreen();
    expect(getByText('Home')).toBeOnTheScreen();
  });
});
