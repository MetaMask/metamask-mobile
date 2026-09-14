import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { dismissBasicFunctionalityMigrationNotification } from '../../../../actions/settings';
import BasicFunctionalityMigrationBottomSheet, {
  BASIC_FUNCTIONALITY_MIGRATION_BLOG_POST_LINK,
  BASIC_FUNCTIONALITY_MIGRATION_PRIVACY_NOTICE_LINK,
} from './BasicFunctionalityMigrationBottomSheet';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Linking: {
    openURL: jest.fn(),
  },
}));

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { forwardRef, useImperativeHandle } =
      jest.requireActual<typeof import('react')>('react');
    const { View: MockView } =
      jest.requireActual<typeof import('react-native')>('react-native');

    const MockBottomSheet = forwardRef<
      { onCloseBottomSheet: (callback?: () => void) => void },
      { children: React.ReactNode }
    >(({ children }, ref) => {
      useImperativeHandle(ref, () => ({
        onCloseBottomSheet: (callback) => callback?.(),
      }));
      return <MockView>{children}</MockView>;
    });
    MockBottomSheet.displayName = 'MockBottomSheet';

    return {
      __esModule: true,
      default: MockBottomSheet,
    };
  },
);

describe('BasicFunctionalityMigrationBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the social-login migration notice', () => {
    const { getByText } = renderWithProvider(
      <BasicFunctionalityMigrationBottomSheet />,
    );

    expect(
      getByText(strings('basic_functionality_migration.social_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('basic_functionality_migration.social_body_1')),
    ).toBeOnTheScreen();
  });

  it('dismisses only after accepting', () => {
    const { getByText } = renderWithProvider(
      <BasicFunctionalityMigrationBottomSheet />,
    );

    expect(mockDispatch).not.toHaveBeenCalled();
    fireEvent.press(
      getByText(strings('basic_functionality_migration.accept_and_close')),
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      dismissBasicFunctionalityMigrationNotification(),
    );
  });

  it('opens the migration information links', () => {
    const { getByText } = renderWithProvider(
      <BasicFunctionalityMigrationBottomSheet />,
    );

    fireEvent.press(
      getByText(strings('basic_functionality_migration.blog_post_link')),
    );
    fireEvent.press(
      getByText(strings('basic_functionality_migration.privacy_notice_link')),
    );

    expect(Linking.openURL).toHaveBeenNthCalledWith(
      1,
      BASIC_FUNCTIONALITY_MIGRATION_BLOG_POST_LINK,
    );
    expect(Linking.openURL).toHaveBeenNthCalledWith(
      2,
      BASIC_FUNCTIONALITY_MIGRATION_PRIVACY_NOTICE_LINK,
    );
  });
});
