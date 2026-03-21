import { renderScreen } from '../../..//util/test/renderWithProvider';
import { UpdateNeeded } from './';
import { fireEvent } from '@testing-library/react-native';
import { MM_APP_STORE_LINK, MM_PLAY_STORE_LINK } from '../../../constants/urls';
import { Linking, Platform } from 'react-native';

// Mock ReusableModal so that dismissModal immediately invokes its callback,
// allowing tests to verify Linking.canOpenURL is called on button press.
jest.mock('../ReusableModal', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { forwardRef, useImperativeHandle } = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: forwardRef(
      ({ children }: { children: React.ReactNode }, ref: React.Ref<unknown>) => {
        useImperativeHandle(ref, () => ({
          dismissModal: (cb?: () => void) => cb?.(),
        }));
        return <View>{children}</View>;
      },
    ),
  };
});

beforeEach(() => {
  Linking.canOpenURL = jest.fn().mockResolvedValue(true);
  Linking.openURL = jest.fn().mockResolvedValue(undefined);
});

describe('UpdateNeeded', () => {
  it('should render snapshot correctly', () => {
    const { toJSON } = renderScreen(
      UpdateNeeded,
      { name: 'UpdateNeeded' },
      { state: {} },
    );
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render correctly', () => {
    const { getByText, getByTestId } = renderScreen(
      UpdateNeeded,
      { name: 'UpdateNeeded' },
      { state: {} },
    );
    const title = getByText('Get the newest features');
    expect(title).toBeDefined();

    const description = getByText(
      'We’ve made your wallet safer, smoother, and added some new features. Update now to stay protected and use our latest improvements.',
    );
    expect(description).toBeDefined();

    const closeButton = getByTestId('update-needed-modal-close-button');
    expect(closeButton).toBeDefined();

    const primaryButton = getByText('Update to latest version');
    expect(primaryButton).toBeDefined();
  });
  it('should open iOS App Store on primary button press', () => {
    Platform.OS = 'ios';
    const { getByText } = renderScreen(
      UpdateNeeded,
      { name: 'UpdateNeeded' },
      { state: {} },
    );
    const primaryButton = getByText('Update to latest version');
    fireEvent.press(primaryButton);
    expect(Linking.canOpenURL).toHaveBeenCalled();
    expect(Linking.canOpenURL).toHaveBeenCalledWith(MM_APP_STORE_LINK);
  });
  it('should open Google Play Store on primary button press', () => {
    Platform.OS = 'android';
    const { getByText } = renderScreen(
      UpdateNeeded,
      { name: 'UpdateNeeded' },
      { state: {} },
    );
    const primaryButton = getByText('Update to latest version');
    fireEvent.press(primaryButton);
    expect(Linking.canOpenURL).toHaveBeenCalled();
    expect(Linking.canOpenURL).toHaveBeenCalledWith(MM_PLAY_STORE_LINK);
  });
});
