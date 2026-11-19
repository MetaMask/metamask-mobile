import React from 'react';
import { render } from '@testing-library/react-native';
import MoneySplashViewGate from './MoneySplashView';
import { useMoneySplashRedirect } from '../../hooks/useMoneySplashRedirect';
import { UserActionType } from '../../../../../actions/user/types';

const mockDispatch = jest.fn();
const mockRedirectAfterSplash = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => ({}),
}));

jest.mock('../../../../../util/test/utils', () => ({
  isE2EOrPerformanceTest: true,
}));

jest.mock('../../hooks/useMoneySplashRedirect', () => ({
  useMoneySplashRedirect: jest.fn(),
}));

const mockUseMoneySplashRedirect = jest.mocked(useMoneySplashRedirect);

describe('MoneySplashView gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneySplashRedirect.mockReturnValue({
      redirectAfterSplash: mockRedirectAfterSplash,
    });
  });

  it('marks the splash seen and resolves the redirect in E2E builds', () => {
    render(<MoneySplashViewGate />);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: UserActionType.SET_MONEY_SPLASH_SEEN,
      payload: { seen: true },
    });
    expect(mockRedirectAfterSplash).toHaveBeenCalledTimes(1);
  });
});
