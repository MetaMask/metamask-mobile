import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import RegionSelectorModal from './RegionSelectorModal';
import { useParams } from '../../../../../../../util/navigation/navUtils';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'RegionSelectorModal',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails: jest.fn(),
  useParams: jest.fn(),
}));

describe('RegionSelectorModal Component (snapshot)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({
      selectedRegionCode: 'US',
      handleSelectRegion: jest.fn(),
    });
  });

  it('renders the default modal', () => {
    const { toJSON } = renderWithProvider(RegionSelectorModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with search results', () => {
    const { getByPlaceholderText, toJSON } = renderWithProvider(RegionSelectorModal);
    fireEvent.changeText(getByPlaceholderText('Search by country'), 'Germany');
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders empty state', () => {
    const { getByPlaceholderText, toJSON } = renderWithProvider(RegionSelectorModal);
    fireEvent.changeText(getByPlaceholderText('Search by country'), 'Nonexistent Country');
    expect(toJSON()).toMatchSnapshot();
  });
});
