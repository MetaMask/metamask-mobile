import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import VipSplashScreenLayout, {
  VIP_SPLASH_SCREEN_TEST_IDS,
} from './VipSplashScreenLayout';
import {
  VIP_GOLD_TEXT_DEFAULT,
  VIP_GOLD_TEXT_MUTED,
  VIP_SPLASH_ACCEPT_BUTTON_BACKGROUND,
} from './Vip.constants';
import { strings } from '../../../../../../locales/i18n';

const defaultProps = {
  testIDs: {
    container: VIP_SPLASH_SCREEN_TEST_IDS.CONTAINER,
    title: VIP_SPLASH_SCREEN_TEST_IDS.TITLE,
    description: VIP_SPLASH_SCREEN_TEST_IDS.DESCRIPTION,
    fox: VIP_SPLASH_SCREEN_TEST_IDS.FOX,
    primaryButton: VIP_SPLASH_SCREEN_TEST_IDS.ACCEPT_BUTTON,
    notNowButton: VIP_SPLASH_SCREEN_TEST_IDS.NOT_NOW_BUTTON,
  },
  onPrimaryPress: jest.fn(),
  onNotNow: jest.fn(),
  primaryButtonLabel: 'Accept invite',
};

describe('VipSplashScreenLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title, description, fox, and both actions', () => {
    const { getByTestId, getByText } = render(
      <VipSplashScreenLayout {...defaultProps} />,
    );

    expect(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.TITLE)).toHaveTextContent(
      strings('rewards.vip.splash_title'),
    );
    expect(
      getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.DESCRIPTION),
    ).toHaveTextContent(strings('rewards.vip.splash_description'));
    expect(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.FOX)).toBeOnTheScreen();
    expect(getByText('Accept invite')).toBeOnTheScreen();
    expect(
      getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.NOT_NOW_BUTTON),
    ).toHaveTextContent(strings('rewards.vip.splash_not_now'));
  });

  it('styles both actions in VIP gold', () => {
    const { getByTestId, getByText } = render(
      <VipSplashScreenLayout {...defaultProps} />,
    );

    expect(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.ACCEPT_BUTTON)).toHaveStyle({
      backgroundColor: VIP_GOLD_TEXT_DEFAULT,
      borderColor: VIP_GOLD_TEXT_DEFAULT,
    });
    expect(getByText('Accept invite')).toHaveStyle({
      color: VIP_SPLASH_ACCEPT_BUTTON_BACKGROUND,
    });
    expect(getByText('Not now')).toHaveStyle({ color: VIP_GOLD_TEXT_MUTED });
  });

  it('invokes the primary and not-now callbacks when pressed', () => {
    const onPrimaryPress = jest.fn();
    const onNotNow = jest.fn();
    const { getByTestId } = render(
      <VipSplashScreenLayout
        {...defaultProps}
        onPrimaryPress={onPrimaryPress}
        onNotNow={onNotNow}
      />,
    );

    fireEvent.press(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.ACCEPT_BUTTON));
    fireEvent.press(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.NOT_NOW_BUTTON));

    expect(onPrimaryPress).toHaveBeenCalledTimes(1);
    expect(onNotNow).toHaveBeenCalledTimes(1);
  });

  it('renders optional children under the description', () => {
    const { getByTestId } = render(
      <VipSplashScreenLayout {...defaultProps}>
        <Text testID="vip-splash-referred-by">Referred by TESTCODE</Text>
      </VipSplashScreenLayout>,
    );

    expect(getByTestId('vip-splash-referred-by')).toHaveTextContent(
      'Referred by TESTCODE',
    );
  });
});
