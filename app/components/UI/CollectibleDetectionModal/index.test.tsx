import CollectibleDetectionModal from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';
import Engine from '../../../core/Engine';

jest.mock('../../../core/Engine', () => ({
  context: {
    NftController: {
      addNft: jest.fn(),
      updateNftMetadata: jest.fn(),
      checkAndUpdateAllNftsOwnershipStatus: jest.fn(),
    },
    NftDetectionController: {
      detectNfts: jest.fn(),
    },
    PreferencesController: {
      setUseNftDetection: jest.fn(),
      setDisplayNftMedia: jest.fn(),
    },
  },
}));

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('CollectibleDetectionModal', () => {
  it('calls NFT detection controller', () => {
    const { getByTestId } = renderWithProvider(<CollectibleDetectionModal />, {
      state: initialState,
    });

    fireEvent.press(getByTestId(`collectible-detection-modal-button`));
    expect(Engine.context.NftDetectionController.detectNfts).toHaveBeenCalled();
  });
});
