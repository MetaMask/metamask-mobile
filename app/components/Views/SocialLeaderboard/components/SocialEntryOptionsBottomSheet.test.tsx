import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SocialEntryOptionsBottomSheet from './SocialEntryOptionsBottomSheet';
import { SocialEntryOptionsBottomSheetSelectorsIDs } from './SocialEntryOptionsBottomSheet.testIds';

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

  it('renders the Report row when open', () => {
    renderWithProvider(
      <SocialEntryOptionsBottomSheet isOpen onClose={jest.fn()} />,
    );

    expect(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.REPORT),
    ).toBeOnTheScreen();
  });

  it('closes after Report is pressed', () => {
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

    expect(onReport).toHaveBeenCalledTimes(1);
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
});
