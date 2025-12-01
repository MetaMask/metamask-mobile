import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  rffSendRedesignDisabledMock,
  rffSendRedesignEnabledMock,
} from '../__mocks__/controllers/remote-feature-flag-controller.mock';

import { AssetType } from '../types/token';
import { InitSendLocation } from '../constants/send';
import { useSendNavigation } from './useSendNavigation';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const mockState = rffSendRedesignDisabledMock;

describe('useSendNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('return function to navigate to send page', () => {
    const { result } = renderHookWithProvider(() => useSendNavigation(), {
      state: mockState,
    });
    expect(result.current.navigateToSendPage).toBeDefined();
  });

  describe('navigateToSendPage', () => {
    it('navigates to send page if send redesign is disabled', () => {
      const { result } = renderHookWithProvider(() => useSendNavigation(), {
        state: mockState,
      });
      result.current.navigateToSendPage({
        location: InitSendLocation.AssetOverview,
        asset: { name: 'ETHEREUM' } as AssetType,
      });
      expect(mockNavigate).toHaveBeenCalledWith('SendFlowView');
    });

    it('navigates to send page if send redesign is enabled', () => {
      const { result } = renderHookWithProvider(() => useSendNavigation(), {
        state: rffSendRedesignEnabledMock,
      });
      result.current.navigateToSendPage({
        location: InitSendLocation.AssetOverview,
        asset: { name: 'ETHEREUM' } as AssetType,
      });
      expect(mockNavigate.mock.calls[0][0]).toEqual('Send');
    });
  });
});
