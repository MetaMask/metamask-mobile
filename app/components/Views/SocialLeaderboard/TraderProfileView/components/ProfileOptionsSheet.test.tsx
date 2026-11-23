import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  getSocialEntryReportReasonTestId,
  SocialEntryOptionsBottomSheetSelectorsIDs,
} from '../../../../UI/SocialFeed/components/SocialEntryOptionsBottomSheet.testIds';
import { SocialEntryReportReason } from '../../../../UI/SocialFeed/reportReasons';
import ProfileOptionsSheet from './ProfileOptionsSheet';
import { ProfileOptionsSheetSelectorsIDs } from './ProfileOptionsSheet.testIds';

const mockOpenSocialSupport = jest.fn();
jest.mock('../../../../UI/SocialFeed/hooks/useOpenSocialSupport', () => ({
  useOpenSocialSupport: () => mockOpenSocialSupport,
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockBottomSheet = ReactActual.forwardRef(
    (
      props: {
        children?: React.ReactNode;
        testID?: string;
        onClose?: () => void;
      },
      ref: React.Ref<{ onCloseBottomSheet: () => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: () => props.onClose?.(),
      }));
      return ReactActual.createElement(
        View,
        { testID: props.testID },
        props.children,
      );
    },
  );
  return { ...actual, BottomSheet: MockBottomSheet };
});

describe('ProfileOptionsSheet', () => {
  const onBlock = jest.fn();
  const onReport = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderSheet = () =>
    renderWithProvider(
      <ProfileOptionsSheet
        traderName="doji"
        onBlock={onBlock}
        onReport={onReport}
        onClose={onClose}
      />,
    );

  it('renders the title, description, report, and block actions', () => {
    renderSheet();

    expect(screen.getByText('Profile options')).toBeOnTheScreen();
    expect(
      screen.getByTestId(ProfileOptionsSheetSelectorsIDs.DESCRIPTION),
    ).toHaveTextContent(
      'Report this profile, or block them to hide their posts and positions on this device for this session. Blocking also unfollows them.',
    );
    expect(
      screen.getByTestId(ProfileOptionsSheetSelectorsIDs.REPORT_BUTTON),
    ).toHaveTextContent('Report @doji');
    expect(
      screen.getByTestId(ProfileOptionsSheetSelectorsIDs.BLOCK_BUTTON),
    ).toHaveTextContent('Block @doji');
  });

  it('blocks and closes the sheet when Block is pressed', () => {
    renderSheet();

    fireEvent.press(
      screen.getByTestId(ProfileOptionsSheetSelectorsIDs.BLOCK_BUTTON),
    );

    expect(onBlock).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not block when the sheet is dismissed', () => {
    renderSheet();

    fireEvent.press(
      screen.getByTestId(ProfileOptionsSheetSelectorsIDs.CLOSE_BUTTON),
    );

    expect(onBlock).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('reports the profile with the chosen reason', () => {
    renderSheet();

    fireEvent.press(
      screen.getByTestId(ProfileOptionsSheetSelectorsIDs.REPORT_BUTTON),
    );
    fireEvent.press(
      screen.getByTestId(
        getSocialEntryReportReasonTestId(SocialEntryReportReason.Privacy),
      ),
    );
    fireEvent.press(
      screen.getByTestId(
        SocialEntryOptionsBottomSheetSelectorsIDs.REPORT_SUBMIT,
      ),
    );

    expect(onReport).toHaveBeenCalledWith(SocialEntryReportReason.Privacy);
    expect(onBlock).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens customer support for impersonation and does not report', () => {
    renderSheet();

    fireEvent.press(
      screen.getByTestId(ProfileOptionsSheetSelectorsIDs.REPORT_BUTTON),
    );
    fireEvent.press(
      screen.getByTestId(
        getSocialEntryReportReasonTestId(SocialEntryReportReason.Impersonation),
      ),
    );
    fireEvent.press(
      screen.getByTestId(
        SocialEntryOptionsBottomSheetSelectorsIDs.REPORT_SUBMIT,
      ),
    );

    expect(onReport).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByTestId(
        SocialEntryOptionsBottomSheetSelectorsIDs.IMPERSONATION_SUPPORT,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        SocialEntryOptionsBottomSheetSelectorsIDs.IMPERSONATION_SUPPORT_DESCRIPTION,
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(
        SocialEntryOptionsBottomSheetSelectorsIDs.IMPERSONATION_SUPPORT_CONTACT,
      ),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockOpenSocialSupport).toHaveBeenCalledTimes(1);
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(
      mockOpenSocialSupport.mock.invocationCallOrder[0],
    );
  });
});
