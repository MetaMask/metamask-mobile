import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useDispatch } from 'react-redux';
import { setDataCollectionForMarketing } from '../../../actions/security';
import { strings } from '../../../../locales/i18n';
import ExperienceEnhancerModal from './';
import { ExperienceEnhancerBottomSheetSelectorsIDs } from './ExperienceEnhancerModal.testIds';

const mockTrackEvent = jest.fn();
const mockIdentify = jest.fn();
const mockIsEnabled = jest.fn();

jest.mock('../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    identify: mockIdentify,
    isEnabled: mockIsEnabled,
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(),
    })),
  }),
}));

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

describe('ExperienceEnhancerModal', () => {
  const dispatchMock = jest.fn();

  beforeEach(() => {
    (useDispatch as jest.Mock).mockReturnValue(dispatchMock);
    mockIsEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle cancel button press correctly', () => {
    const { getByTestId } = render(<ExperienceEnhancerModal />);

    const cancelButton = getByTestId(
      ExperienceEnhancerBottomSheetSelectorsIDs.CANCEL_BUTTON,
    );

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

    fireEvent.press(acceptButton);
    expect(dispatchMock).toHaveBeenCalledWith(
      setDataCollectionForMarketing(true),
    );
  });

  it('sends marketing consent signals when MetaMetrics is on', () => {
    const { getByTestId } = render(<ExperienceEnhancerModal />);

    fireEvent.press(
      getByTestId(ExperienceEnhancerBottomSheetSelectorsIDs.ACCEPT_BUTTON),
    );

    expect(mockIdentify).toHaveBeenCalledWith({
      has_marketing_consent: true,
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('keeps the marketing choice without sending signals when MetaMetrics is off', () => {
    mockIsEnabled.mockReturnValue(false);
    const { getByTestId } = render(<ExperienceEnhancerModal />);

    fireEvent.press(
      getByTestId(ExperienceEnhancerBottomSheetSelectorsIDs.ACCEPT_BUTTON),
    );
    fireEvent.press(
      getByTestId(ExperienceEnhancerBottomSheetSelectorsIDs.CANCEL_BUTTON),
    );

    expect(dispatchMock).toHaveBeenCalledWith(
      setDataCollectionForMarketing(true),
    );
    expect(dispatchMock).toHaveBeenCalledWith(
      setDataCollectionForMarketing(false),
    );
    expect(mockIdentify).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('renders the marketing paragraph and footer without a MetaMetrics link', () => {
    const { getByText, queryByText } = render(<ExperienceEnhancerModal />);

    expect(
      getByText(strings('experience_enhancer_modal.paragraph1b')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('experience_enhancer_modal.footer')),
    ).toBeOnTheScreen();
    expect(queryByText('MetaMetrics')).toBeNull();
    expect(queryByText('In addition to')).toBeNull();
  });
});
