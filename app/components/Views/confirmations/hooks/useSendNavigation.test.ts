import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';

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

describe('useSendNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('return function to navigate to send page', () => {
    const { result } = renderHookWithProvider(() => useSendNavigation());

    expect(result.current.navigateToSendPage).toBeDefined();
  });

  describe('navigateToSendPage', () => {
    it('navigates to redesigned send page', () => {
      const { result } = renderHookWithProvider(() => useSendNavigation());

      result.current.navigateToSendPage({
        location: InitSendLocation.AssetOverview,
        asset: { name: 'ETHEREUM' } as AssetType,
      });

      expect(mockNavigate.mock.calls[0][0]).toEqual('Send');
    });
  });
});
