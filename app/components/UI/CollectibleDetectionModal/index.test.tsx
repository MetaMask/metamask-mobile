import CollectibleDetectionModal from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';
import { ToastSeverity } from '@metamask/design-system-react-native';

const mockDetectNfts = jest.fn();
const mockToast = jest.fn();

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign((...args: unknown[]) => mockToast(...args), {
      dismiss: jest.fn(),
    }),
  };
});

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

jest.mock('../../hooks/useNftDetection', () => ({
  useNftDetection: () => ({
    detectNfts: mockDetectNfts,
    chainIdsToDetectNftsFor: ['0x1'],
  }),
}));

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('CollectibleDetectionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls detectNfts from useNftDetection hook when button is pressed', () => {
    const { getByTestId } = renderWithProvider(<CollectibleDetectionModal />, {
      state: initialState,
    });

    fireEvent.press(getByTestId(`collectible-detection-modal-button`));

    expect(mockDetectNfts).toHaveBeenCalled();
  });

  it('shows success toast when NFT detection is enabled', () => {
    const { getByTestId } = renderWithProvider(<CollectibleDetectionModal />, {
      state: initialState,
    });

    fireEvent.press(getByTestId(`collectible-detection-modal-button`));

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.any(String),
        severity: ToastSeverity.Success,
        hasNoTimeout: false,
        showCloseButton: false,
      }),
    );
  });
});
