import { renderScreen } from '../../..//util/test/renderWithProvider';
import { UpdateNeeded } from './';
import { fireEvent } from '@testing-library/react-native';
import { MM_APP_STORE_LINK, MM_PLAY_STORE_LINK } from '../../../constants/urls';
import { Platform } from 'react-native';

const mockCanOpenURL = jest.fn(() => Promise.resolve(true));
const mockOpenURL = jest.fn(() => Promise.resolve());
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: mockOpenURL,
  canOpenURL: mockCanOpenURL,
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener,
}));

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
    expect(mockCanOpenURL).toHaveBeenCalled();
    expect(mockCanOpenURL).toHaveBeenCalledWith(MM_APP_STORE_LINK);
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
    expect(mockCanOpenURL).toHaveBeenCalled();
    expect(mockCanOpenURL).toHaveBeenCalledWith(MM_PLAY_STORE_LINK);
  });
});
