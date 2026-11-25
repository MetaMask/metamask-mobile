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
) => render(<GetStartedBanner onPress={jest.fn()} {...props} />);

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
    renderBanner({ onPress });

    fireEvent.press(screen.getByTestId(PredictHomeTestIds.GET_STARTED_BANNER));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has no dismiss action', () => {
    renderBanner();

    expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
  });

  it('is intrinsically disabled while setup is opening', () => {
    const onPress = jest.fn();
    renderBanner({ isDisabled: true });

    const banner = screen.getByTestId(PredictHomeTestIds.GET_STARTED_BANNER);
    expect(banner).toBeDisabled();

    fireEvent.press(banner);

    expect(onPress).not.toHaveBeenCalled();
  });
});
