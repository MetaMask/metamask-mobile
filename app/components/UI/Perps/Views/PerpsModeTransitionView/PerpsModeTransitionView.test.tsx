import React from 'react';
import { render, act } from '@testing-library/react-native';
import PerpsModeTransitionView from './PerpsModeTransitionView';
import Routes from '../../../../../constants/navigation/Routes';
import { PerpsModeTransitionSelectorsIDs } from '../../Perps.testIds';

const mockNavigate = jest.fn();
let mockRouteParams: { mode?: 'lite' | 'pro' } = { mode: 'pro' };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.mode.pro_transition_title': 'Pro Mode',
      'perps.mode.lite_transition_title': 'Lite Mode',
    };
    return translations[key] || key;
  }),
}));

describe('PerpsModeTransitionView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockNavigate.mockClear();
    mockRouteParams = { mode: 'pro' };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the Pro Mode interstitial when navigated to with mode "pro"', () => {
    const { getByTestId } = render(<PerpsModeTransitionView />);

    expect(
      getByTestId(PerpsModeTransitionSelectorsIDs.TITLE),
    ).toHaveTextContent('Pro Mode');
  });

  it('renders the Lite Mode interstitial when navigated to with mode "lite"', () => {
    mockRouteParams = { mode: 'lite' };

    const { getByTestId } = render(<PerpsModeTransitionView />);

    expect(
      getByTestId(PerpsModeTransitionSelectorsIDs.TITLE),
    ).toHaveTextContent('Lite Mode');
  });

  it('defaults to the Lite Mode interstitial when no mode param is provided', () => {
    mockRouteParams = {};

    const { getByTestId } = render(<PerpsModeTransitionView />);

    expect(
      getByTestId(PerpsModeTransitionSelectorsIDs.TITLE),
    ).toHaveTextContent('Lite Mode');
  });

  it('redirects to the Perps home screen after the interstitial duration', () => {
    render(<PerpsModeTransitionView />);

    expect(mockNavigate).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.PERPS_HOME);
  });
});
