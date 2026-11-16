import {
  addDeviceToWalletPageOptions,
  fullScreenModalSlideFromBottomNativeOptions,
} from './clearStackNavigatorOptions';

describe('addDeviceToWalletPageOptions', () => {
  it('presents Add device as a full page that slides from the right', () => {
    expect(addDeviceToWalletPageOptions).toEqual({
      headerShown: false,
      animation: 'slide_from_right',
      presentation: 'card',
    });
  });
});

describe('fullScreenModalSlideFromBottomNativeOptions', () => {
  it('presents a full-screen card that slides from the bottom', () => {
    expect(fullScreenModalSlideFromBottomNativeOptions).toEqual({
      animation: 'slide_from_bottom',
      headerShown: false,
      presentation: 'card',
    });
  });
});
