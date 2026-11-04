import React from 'react';
import { renderScreen } from '../../../util/test/renderWithProvider';
import CollectiblesSectionScreen, {
  CollectiblesView,
} from './CollectiblesView';
import {
  enterCollectiblesSection,
  exitContextualSection,
} from '../../Nav/Main/contextualNav/contextualSection';

jest.mock('../../hooks/useIsGlassSurfaceEnabled', () => ({
  useIsGlassSurfaceEnabled: () => false,
}));

jest.mock('../../../selectors/featureFlagController/moneyBrandRefresh', () => ({
  selectMoneyBrandRefreshEnabled: jest.fn(() => false),
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
  });

  it('renders the centered Collectibles header when embedded in Trade', () => {
    const EmbeddedCollectibles = () => <CollectiblesView embedded />;

    const { getByText } = renderScreen(
      EmbeddedCollectibles,
      { name: 'CollectiblesView' },
      { state: {} },
    );

    expect(getByText('Collectibles')).toBeOnTheScreen();
    expect(getByText('Placeholder')).toBeOnTheScreen();
  });
});
