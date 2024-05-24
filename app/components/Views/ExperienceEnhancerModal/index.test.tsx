import React from 'react';
import ExperienceEnhancerModal from './';
import { render, fireEvent } from '@testing-library/react-native';
import { useDispatch } from 'react-redux';
import { Linking } from 'react-native';
import { setDataCollectionForMarketing } from '../../../actions/security';
import { HOW_TO_MANAGE_METRAMETRICS_SETTINGS } from '../../../constants/urls';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Mock the BottomSheet component
jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const mockBottomSheet = ({ children }: any) => <>{children}</>;
    return mockBottomSheet;
  },
);

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

describe('ExperienceEnhancerModal', () => {
  const dispatchMock = jest.fn();

  beforeEach(() => {
    (useDispatch as jest.Mock).mockReturnValue(dispatchMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { toJSON } = render(
      <SafeAreaProvider>
        <ExperienceEnhancerModal />
      </SafeAreaProvider>,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('should handle cancel button press correctly', () => {
    const { getByTestId } = render(<ExperienceEnhancerModal />);

    const cancelButton = getByTestId('cancel-button');
    expect(cancelButton).toBeTruthy();

    fireEvent.press(cancelButton);
    expect(dispatchMock).toHaveBeenCalledWith(
      setDataCollectionForMarketing(false),
    );
  });

  it('should handle accept button press correctly', () => {
    const { getByTestId } = render(<ExperienceEnhancerModal />);

    const acceptButton = getByTestId('accept-button');
    expect(acceptButton).toBeTruthy();

    fireEvent.press(acceptButton);
    expect(dispatchMock).toHaveBeenCalledWith(
      setDataCollectionForMarketing(true),
    );
  });

  it('should open URL when link button is pressed', () => {
    const { getByTestId } = render(<ExperienceEnhancerModal />);

    const linkButton = getByTestId('link-button');
    expect(linkButton).toBeTruthy();

    fireEvent.press(linkButton);
    expect(Linking.openURL).toHaveBeenCalledWith(
      HOW_TO_MANAGE_METRAMETRICS_SETTINGS,
    );
  });
});
