import { renderHook } from '@testing-library/react-native';

import { AssetType } from '../types/token';
import { useSendNavigation } from './useSendNavigation';
import { InitSendLocation } from '../constants/send';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('useSendNavigation', () => {
  it('return function to navigate to send page', () => {
    const { result } = renderHook(() => useSendNavigation());
    expect(result.current.navigateToSendPage).toBeDefined();
  });

  it('function returned navigates to send page', () => {
    const { result } = renderHook(() => useSendNavigation());
    result.current.navigateToSendPage(InitSendLocation.AssetOverview, {
      name: 'ETHEREUM',
    } as AssetType);
    expect(mockNavigate).toHaveBeenCalledWith('SendFlowView');
  });
});
