import React from 'react';
import NftFullView from './NftFullView';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { FixedTabPillRowProvider } from '../../Nav/Main/FixedTabNav/FixedTabPillRow';

jest.mock('../../UI/NftGrid/NftGrid', () => 'NftGrid');

jest.mock('../../Nav/Main/FixedTabNav/HubProfileButton', () => {
  const { Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <Pressable testID="profile-button" />,
  };
});

describe('NftFullView', () => {
  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
      },
    },
  };

  it('renders NftGrid with isFullView prop', () => {
    // Arrange & Act
    const { UNSAFE_getByType } = renderWithProvider(<NftFullView />, {
      state: initialState,
    });

    // Assert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nftGrid = UNSAFE_getByType('NftGrid' as any);
    expect(nftGrid.props.isFullView).toBe(true);
  });

  it('renders the profile avatar, the pill row, and no title', () => {
    // Arrange & Act
    const { getByTestId, queryByTestId, queryByText } = renderWithProvider(
      <FixedTabPillRowProvider
        value={{
          testID: 'fixed-tab-collect',
          pills: [
            { key: 'collection', label: 'Collection', Screen: NftFullView },
          ],
          selectedKey: 'collection',
          onChange: jest.fn(),
        }}
      >
        <NftFullView />
      </FixedTabPillRowProvider>,
      { state: initialState },
    );

    expect(getByTestId('profile-button')).toBeOnTheScreen();
    expect(getByTestId('fixed-tab-collect-pills')).toBeOnTheScreen();
    expect(queryByTestId('back-button')).toBeNull();
    expect(queryByText('NFTs')).toBeNull();
  });
});
