import { renderHook } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import useCheckNftAutoDetectionModal from './useCheckNftAutoDetectionModal';
import { setNftAutoDetectionModalOpen } from '../../../actions/security';
import Routes from '../../../constants/navigation/Routes';
import { isMainNet } from '../../../util/networks';
import { selectUseNftDetection } from '../../../selectors/preferencesController';
import { selectProviderConfig } from '../../../selectors/networkController';

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

describe('useCheckNftAutoDetectionModal', () => {
  const dispatchMock = jest.fn();
  const navigateMock = jest.fn();

  beforeEach(() => {
    (useDispatch as jest.Mock).mockReturnValue(dispatchMock);
    (useNavigation as jest.Mock).mockReturnValue({ navigate: navigateMock });
    (useSelector as jest.Mock).mockImplementation((selector) => {
      switch (selector) {
        case selectUseNftDetection:
          return false;
        case selectProviderConfig:
          return { chainId: '1' };
        default:
          return false;
      }
    });
    (isMainNet as jest.Mock).mockReturnValue(true);
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
    (isMainNet as jest.Mock).mockReturnValue(false);

    renderHook(() => useCheckNftAutoDetectionModal());

    expect(navigateMock).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalled();
  });
});
