import React from 'react';
import { Pressable, View } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SocialEntryOptionsBottomSheet, {
  SocialEntryReportReason,
  SocialEntryOptionsProvider,
  useSocialEntryOptions,
} from './SocialEntryOptionsBottomSheet';
import {
  getSocialEntryReportReasonTestId,
  SocialEntryOptionsBottomSheetSelectorsIDs,
} from './SocialEntryOptionsBottomSheet.testIds';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('SocialEntryOptionsBottomSheet', () => {
  it('renders nothing while closed', () => {
    const { toJSON } = renderWithProvider(
      <SocialEntryOptionsBottomSheet isOpen={false} onClose={jest.fn()} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders all moderation actions when open', () => {
    renderWithProvider(
      <SocialEntryOptionsBottomSheet isOpen onClose={jest.fn()} />,
    );

    expect(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.REPORT),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.HIDE_POST),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.BLOCK_USER),
    ).toBeOnTheScreen();
  });

  it('collects a reason before submitting a report', () => {
    const onClose = jest.fn();
    const onReport = jest.fn();

    renderWithProvider(
      <SocialEntryOptionsBottomSheet
        isOpen
        onClose={onClose}
        onReport={onReport}
      />,
    );

    fireEvent.press(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.REPORT),
    );

    expect(
      screen.getByTestId(
        SocialEntryOptionsBottomSheetSelectorsIDs.REPORT_REASON_SHEET,
      ),
    ).toBeOnTheScreen();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.press(
      screen.getByTestId(
        getSocialEntryReportReasonTestId(SocialEntryReportReason.Spam),
      ),
    );
    fireEvent.press(
      screen.getByTestId(
        SocialEntryOptionsBottomSheetSelectorsIDs.REPORT_SUBMIT,
      ),
    );

    expect(onReport).toHaveBeenCalledWith(SocialEntryReportReason.Spam);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not submit a report until a reason is selected', () => {
    const onClose = jest.fn();
    const onReport = jest.fn();

    renderWithProvider(
      <SocialEntryOptionsBottomSheet
        isOpen
        onClose={onClose}
        onReport={onReport}
      />,
    );

    fireEvent.press(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.REPORT),
    );
    fireEvent.press(
      screen.getByTestId(
        SocialEntryOptionsBottomSheetSelectorsIDs.REPORT_SUBMIT,
      ),
    );

    expect(onReport).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it.each([
    [SocialEntryOptionsBottomSheetSelectorsIDs.HIDE_POST, 'onHidePost'],
    [SocialEntryOptionsBottomSheetSelectorsIDs.BLOCK_USER, 'onBlockUser'],
  ] as const)('closes after %s is pressed', (testID, callbackName) => {
    const onClose = jest.fn();
    const callback = jest.fn();

    renderWithProvider(
      <SocialEntryOptionsBottomSheet
        isOpen
        onClose={onClose}
        {...{ [callbackName]: callback }}
      />,
    );

    fireEvent.press(screen.getByTestId(testID));

    expect(callback).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes from the backdrop without reporting', () => {
    const onClose = jest.fn();
    const onReport = jest.fn();

    renderWithProvider(
      <SocialEntryOptionsBottomSheet
        isOpen
        onClose={onClose}
        onReport={onReport}
      />,
    );

    fireEvent.press(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.BACKDROP),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onReport).not.toHaveBeenCalled();
  });

  it('hosts a single sheet outside the trigger when a provider is mounted', () => {
    const Trigger = () => {
      const { open, sheet } = useSocialEntryOptions({
        postId: 'post-1',
        authorId: 'author-1',
        authorHandle: 'alice',
      });
      return (
        <>
          <Pressable testID="options-trigger" onPress={open} />
          {sheet}
        </>
      );
    };

    renderWithProvider(
      <SocialEntryOptionsProvider>
        <Trigger />
      </SocialEntryOptionsProvider>,
    );

    expect(
      screen.queryByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.SHEET),
    ).toBeNull();

    fireEvent.press(screen.getByTestId('options-trigger'));

    expect(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
  });

  it('hides only the selected post', () => {
    const Entry = ({ postId }: { postId: string }) => {
      const { open, isHidden } = useSocialEntryOptions({
        postId,
        authorId: 'author-1',
        authorHandle: 'alice',
      });
      if (isHidden) {
        return null;
      }
      return (
        <>
          <Pressable testID={`trigger-${postId}`} onPress={open} />
          <View testID={`post-${postId}`} />
        </>
      );
    };

    renderWithProvider(
      <SocialEntryOptionsProvider>
        <Entry postId="one" />
        <Entry postId="two" />
      </SocialEntryOptionsProvider>,
    );

    fireEvent.press(screen.getByTestId('trigger-one'));
    fireEvent.press(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.HIDE_POST),
    );

    expect(screen.queryByTestId('post-one')).toBeNull();
    expect(screen.getByTestId('post-two')).toBeOnTheScreen();
  });

  it('hides every post from a blocked user', () => {
    const Entry = ({ postId }: { postId: string }) => {
      const { open, isHidden } = useSocialEntryOptions({
        postId,
        authorId: 'author-1',
        authorHandle: 'alice',
      });
      if (isHidden) {
        return null;
      }
      return (
        <>
          <Pressable testID={`trigger-${postId}`} onPress={open} />
          <View testID={`post-${postId}`} />
        </>
      );
    };

    renderWithProvider(
      <SocialEntryOptionsProvider>
        <Entry postId="one" />
        <Entry postId="two" />
      </SocialEntryOptionsProvider>,
    );

    fireEvent.press(screen.getByTestId('trigger-one'));
    fireEvent.press(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.BLOCK_USER),
    );

    expect(screen.queryByTestId('post-one')).toBeNull();
    expect(screen.queryByTestId('post-two')).toBeNull();
  });
});
