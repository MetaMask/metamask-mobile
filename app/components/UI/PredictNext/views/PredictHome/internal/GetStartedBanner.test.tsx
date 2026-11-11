import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import { GetStartedBanner } from './GetStartedBanner';
import { PredictHomeTestIds } from '../PredictHome.testIds';

const renderBanner = (
  props: Partial<React.ComponentProps<typeof GetStartedBanner>> = {},
) =>
  render(
    <GetStartedBanner onPress={jest.fn()} onDismiss={jest.fn()} {...props} />,
  );

describe('GetStartedBanner', () => {
  it('renders the title, body and image tile on its own', () => {
    renderBanner();

    const banner = screen.getByTestId(PredictHomeTestIds.GET_STARTED_BANNER);
    expect(
      within(banner).getByText(
        strings('predict_next.get_started_banner.title'),
      ),
    ).toBeOnTheScreen();
    expect(
      within(banner).getByText(strings('predict_next.get_started_banner.body')),
    ).toBeOnTheScreen();
    expect(
      within(banner).getByTestId(PredictHomeTestIds.GET_STARTED_BANNER_IMAGE),
    ).toBeOnTheScreen();
  });

  it('calls onPress once when the banner is pressed', () => {
    const onPress = jest.fn();
    const onDismiss = jest.fn();
    renderBanner({ onPress, onDismiss });

    fireEvent.press(screen.getByTestId(PredictHomeTestIds.GET_STARTED_BANNER));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('calls onDismiss without onPress when the close button is pressed', () => {
    const onPress = jest.fn();
    const onDismiss = jest.fn();
    renderBanner({ onPress, onDismiss });

    fireEvent.press(
      screen.getByTestId(PredictHomeTestIds.GET_STARTED_BANNER_DISMISS),
    );

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  // On Android a press on a nested pressable can also reach its parent, so the
  // close button must stay outside the banner's press target.
  it('keeps the close button outside the banner press target', () => {
    renderBanner();

    const banner = screen.getByTestId(PredictHomeTestIds.GET_STARTED_BANNER);

    expect(
      screen.getByTestId(PredictHomeTestIds.GET_STARTED_BANNER_DISMISS),
    ).toBeOnTheScreen();
    expect(
      within(banner).queryByTestId(
        PredictHomeTestIds.GET_STARTED_BANNER_DISMISS,
      ),
    ).not.toBeOnTheScreen();
  });
});
