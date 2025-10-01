import React from 'react';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import UnsupportedRegionModal from './UnsupportedRegionModal';
import Routes from '../../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { RampSDK } from '../../sdk';
import { RampType } from '../../types';

const mockRegion = {
  id: 'AF',
  name: 'Afghanistan',
  emoji: '🇦🇫',
  unsupported: true,
};

function render(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: Routes.RAMP.MODALS.UNSUPPORTED_REGION,
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

const mockUseRampSDKInitialValues: Partial<RampSDK> = {
  rampType: RampType.BUY,
  isBuy: true,
  isSell: false,
};

let mockUseRampSDKValues: Partial<RampSDK> = {
  ...mockUseRampSDKInitialValues,
};

jest.mock('../../sdk', () => ({
  useRampSDK: () => mockUseRampSDKValues,
}));

const mockUseParams = jest.fn();
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

// jest.mock('react-native/Libraries/Linking/Linking', () => ({
//   openURL: jest.fn(),
//   addEventListener: jest.fn(),
//   removeEventListener: jest.fn(),
// }));

describe('UnsupportedRegionModal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
    };
    mockUseParams.mockReturnValue({ region: mockRegion });
  });

  it('renders correctly for buy flow', () => {
    const { toJSON } = render(UnsupportedRegionModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly for sell flow', () => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      isBuy: false,
      isSell: true,
    };
    const { toJSON } = render(UnsupportedRegionModal);
    expect(toJSON()).toMatchSnapshot();
  });
});
