import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setDataCollectionForMarketing } from '../../../actions/security';
import { strings } from '../../../../locales/i18n';
import OAuthService from '../../../core/OAuthService/OAuthService';
import ExperienceEnhancerModal from './';
import { ExperienceEnhancerBottomSheetSelectorsIDs } from './ExperienceEnhancerModal.testIds';

jest.mock('../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    identify: jest.fn(),
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
  useSelector: jest.fn(),
}));

jest.mock('../../../core/OAuthService/OAuthService', () => ({
  __esModule: true,
  default: {
    updateMarketingOptInStatus: jest.fn(),
  },
}));

describe('ExperienceEnhancerModal', () => {
  const dispatchMock = jest.fn();
  const useSelectorMock = useSelector as jest.Mock;
  const updateMarketingOptInStatusMock = jest.mocked(
    OAuthService.updateMarketingOptInStatus,
  );

  beforeEach(() => {
    (useDispatch as jest.Mock).mockReturnValue(dispatchMock);
    useSelectorMock.mockImplementation(
      (selector: (state: unknown) => unknown) => selector({}),
    );
    updateMarketingOptInStatusMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle cancel button press correctly', () => {
    useSelectorMock.mockReturnValue(true);
    const { getByTestId } = render(<ExperienceEnhancerModal />);

    const cancelButton = getByTestId(
      ExperienceEnhancerBottomSheetSelectorsIDs.CANCEL_BUTTON,
    );

    fireEvent.press(cancelButton);
    expect(dispatchMock).toHaveBeenCalledWith(
      setDataCollectionForMarketing(false),
    );
    expect(updateMarketingOptInStatusMock).toHaveBeenCalledWith(false);
  });

  it('should handle accept button press correctly', () => {
    useSelectorMock.mockReturnValue(true);
    const { getByTestId } = render(<ExperienceEnhancerModal />);

    const acceptButton = getByTestId(
      ExperienceEnhancerBottomSheetSelectorsIDs.ACCEPT_BUTTON,
    );

    fireEvent.press(acceptButton);
    expect(dispatchMock).toHaveBeenCalledWith(
      setDataCollectionForMarketing(true),
    );
    expect(updateMarketingOptInStatusMock).toHaveBeenCalledWith(true);
  });

  it('does not post to the auth server for non-social-login users', () => {
    useSelectorMock.mockReturnValue(false);
    const { getByTestId } = render(<ExperienceEnhancerModal />);

    fireEvent.press(
      getByTestId(ExperienceEnhancerBottomSheetSelectorsIDs.ACCEPT_BUTTON),
    );
    fireEvent.press(
      getByTestId(ExperienceEnhancerBottomSheetSelectorsIDs.CANCEL_BUTTON),
    );

    expect(updateMarketingOptInStatusMock).not.toHaveBeenCalled();
  });

  it('keeps the local decision when the auth server sync fails', async () => {
    useSelectorMock.mockReturnValue(true);
    updateMarketingOptInStatusMock.mockRejectedValue(new Error('sync failed'));
    const { getByTestId } = render(<ExperienceEnhancerModal />);

    fireEvent.press(
      getByTestId(ExperienceEnhancerBottomSheetSelectorsIDs.CANCEL_BUTTON),
    );

    // Flush the rejected sync before asserting no revert happened.
    await act(async () => {
      await Promise.resolve();
    });

    expect(dispatchMock).toHaveBeenCalledWith(
      setDataCollectionForMarketing(false),
    );
    expect(dispatchMock).not.toHaveBeenCalledWith(
      setDataCollectionForMarketing(true),
    );
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
