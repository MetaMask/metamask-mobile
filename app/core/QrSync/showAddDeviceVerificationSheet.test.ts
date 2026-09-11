import Routes from '../../constants/navigation/Routes';
import type { AppNavigationProp } from '../NavigationService/types';
import { showAddDeviceVerificationSheet } from './showAddDeviceVerificationSheet';

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
} as unknown as AppNavigationProp;

describe('showAddDeviceVerificationSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to the verification sheet on the current stack', () => {
    showAddDeviceVerificationSheet(mockNavigation);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SHEET.ADD_DEVICE_VERIFICATION_CODE,
    );
  });
});
