import { renderHook } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import useCheckNftAutoDetectionModal from './useCheckNftAutoDetectionModal';
import { setNftAutoDetectionModalOpen } from '../../../actions/security';
import Routes from '../../../constants/navigation/Routes';
import { isMainNet } from '../../../util/networks';
import { selectUseNftDetection } from '../../../selectors/preferencesController';
import { selectProviderConfig } from '../../../selectors/networkController';
import { selectIsInBasicFunctionalityConsolidationRollout } from '../../../selectors/featureFlagController/basicFunctionalityConsolidation';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';

// Mock the necessary modules
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../util/networks', () => ({
  isMainNet: jest.fn(),
}));

jest.mock('../../../selectors/preferencesController', () => ({
  selectUseNftDetection: jest.fn(),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectProviderConfig: jest.fn(),
}));

jest.mock(
  '../../../selectors/featureFlagController/basicFunctionalityConsolidation',
  () => ({
    selectIsInBasicFunctionalityConsolidationRollout: jest.fn(),
  }),
);

jest.mock('../../../selectors/settings', () => ({
  selectBasicFunctionalityEnabled: jest.fn(),
}));

describe('useCheckNftAutoDetectionModal', () => {
  const dispatchMock = jest.fn();
  const navigateMock = jest.fn();

  const mockSelectors = ({
    isConsolidationRolloutEnabled = false,
    isBasicFunctionalityEnabled = true,
  }: {
    isConsolidationRolloutEnabled?: boolean;
    isBasicFunctionalityEnabled?: boolean;
  } = {}) => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      switch (selector) {
        case selectUseNftDetection:
          return false;
        case selectProviderConfig:
          return { chainId: '1' };
        case selectIsInBasicFunctionalityConsolidationRollout:
          return isConsolidationRolloutEnabled;
        case selectBasicFunctionalityEnabled:
          return isBasicFunctionalityEnabled;
        default:
          return false;
      }
    });
  };

  beforeEach(() => {
    (useDispatch as jest.Mock).mockReturnValue(dispatchMock);
    (useNavigation as jest.Mock).mockReturnValue({ navigate: navigateMock });
    mockSelectors();
    (isMainNet as unknown as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should navigate and dispatch action when conditions are met', () => {
    renderHook(() => useCheckNftAutoDetectionModal());

    expect(navigateMock).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.NFT_AUTO_DETECTION_MODAL,
    });
    expect(dispatchMock).toHaveBeenCalledWith(
      setNftAutoDetectionModalOpen(true),
    );
  });

  it('should not navigate or dispatch action when conditions are not met', () => {
    (isMainNet as unknown as jest.Mock).mockReturnValue(false);

    renderHook(() => useCheckNftAutoDetectionModal());

    expect(navigateMock).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('does not show the modal while the Basic Functionality consolidation rollout is on', () => {
    mockSelectors({ isConsolidationRolloutEnabled: true });

    renderHook(() => useCheckNftAutoDetectionModal());

    expect(navigateMock).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('does not show the modal while Basic Functionality is off', () => {
    mockSelectors({ isBasicFunctionalityEnabled: false });

    renderHook(() => useCheckNftAutoDetectionModal());

    expect(navigateMock).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalled();
  });
});
