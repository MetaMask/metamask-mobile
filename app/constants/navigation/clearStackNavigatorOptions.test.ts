import { addDeviceToWalletPageOptions } from './clearStackNavigatorOptions';

describe('addDeviceToWalletPageOptions', () => {
  it('presents Add device as a full page that slides from the right', () => {
    expect(addDeviceToWalletPageOptions).toEqual({
      headerShown: false,
      animation: 'slide_from_right',
      presentation: 'card',
      fullScreenGestureEnabled: true,
    });
  });
});
