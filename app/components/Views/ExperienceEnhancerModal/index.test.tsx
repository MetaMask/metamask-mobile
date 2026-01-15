import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { setDataCollectionForMarketing } from '../../../actions/security';
import { HOW_TO_MANAGE_METRAMETRICS_SETTINGS } from '../../../constants/urls';
import ExperienceEnhancerModal from './';
import { ExperienceEnhancerBottomSheetSelectorsIDs } from './ExperienceEnhancerModal.testIds';

// Mock the BottomSheet component
jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    const cancelButton = getByTestId(
      ExperienceEnhancerBottomSheetSelectorsIDs.CANCEL_BUTTON,
    );
    expect(cancelButton).toBeTruthy();

    fireEvent.press(cancelButton);
    expect(dispatchMock).toHaveBeenCalledWith(
      setDataCollectionForMarketing(false),
    );
  });

  it('should handle accept button press correctly', () => {
    const { getByTestId } = render(<ExperienceEnhancerModal />);

    const acceptButton = getByTestId(
      ExperienceEnhancerBottomSheetSelectorsIDs.ACCEPT_BUTTON,
    );
    expect(acceptButton).toBeTruthy();

    fireEvent.press(acceptButton);
    expect(dispatchMock).toHaveBeenCalledWith(
      setDataCollectionForMarketing(true),
    );
  });

  it('should open URL when link button is pressed', () => {
    const { getByTestId } = render(<ExperienceEnhancerModal />);

    const linkButton = getByTestId(
      ExperienceEnhancerBottomSheetSelectorsIDs.LINK_BUTTON,
    );
    expect(linkButton).toBeTruthy();

    fireEvent.press(linkButton);
    expect(Linking.openURL).toHaveBeenCalledWith(
      HOW_TO_MANAGE_METRAMETRICS_SETTINGS,
    );
  });
});
