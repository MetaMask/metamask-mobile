import React, { ReactNode } from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import ConnectionDetails from './ConnectionDetails';
import { strings } from '../../../../../locales/i18n';

const mockOnCloseBottomSheet = jest.fn();
let mockRouteParams: Record<string, unknown> = {};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useRoute: () => ({
      params: mockRouteParams,
    }),
  };
});

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { forwardRef, useImperativeHandle } = jest.requireActual('react');
    interface MockBottomSheetRef {
      onCloseBottomSheet: () => void;
    }
    return forwardRef(
      (
        { children }: { children: ReactNode },
        ref: React.Ref<MockBottomSheetRef>,
      ) => {
        useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));
        return <>{children}</>;
      },
    );
  },
);

describe('ConnectionDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
  });

  it('renders correctly', () => {
    mockRouteParams = {
      connectionDateTime: 1677628800000, // March 1, 2023
    };
    const { toJSON } = renderWithProvider(<ConnectionDetails />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays the correct title', () => {
    mockRouteParams = {
      connectionDateTime: 1677628800000,
    };
    const { getByText } = renderWithProvider(<ConnectionDetails />);

    expect(
      getByText(strings('permissions.connection_details_title')),
    ).toBeTruthy();
  });

  it('formats and displays the connection date correctly', () => {
    const timestamp = 1677628800000; // March 1, 2023
    const expectedFormattedDate = 'Feb 28, 2023';

    mockRouteParams = {
      connectionDateTime: timestamp,
    };
    const { getByText } = renderWithProvider(<ConnectionDetails />);

    expect(
      getByText(
        strings('permissions.connection_details_description', {
          connectionDateTime: expectedFormattedDate,
        }),
      ),
    ).toBeTruthy();
  });

  it('uses default timestamp when connectionDateTime is not provided', () => {
    const defaultTimestamp = 123456789;
    const expectedFormattedDate = new Date(defaultTimestamp).toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      },
    );

    mockRouteParams = {};
    const { getByText } = renderWithProvider(<ConnectionDetails />);

    expect(
      getByText(
        strings('permissions.connection_details_description', {
          connectionDateTime: expectedFormattedDate,
        }),
      ),
    ).toBeTruthy();
  });

  it('calls onCloseBottomSheet when Got It button is pressed', () => {
    mockRouteParams = {
      connectionDateTime: 1677628800000,
    };
    const { getByText } = renderWithProvider(<ConnectionDetails />);

    const gotItButton = getByText(strings('permissions.got_it'));
    fireEvent.press(gotItButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
