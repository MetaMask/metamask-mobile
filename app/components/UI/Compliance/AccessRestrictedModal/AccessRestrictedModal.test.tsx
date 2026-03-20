import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AccessRestrictedModal from './AccessRestrictedModal';
import { AccessRestrictedModalSelectorsIDs } from './AccessRestrictedModal.testIds';

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => ({
    __esModule: true,
    default: jest.fn(({ children, testID }) => (
      <>
        {testID ? (
          <mock-bottomsheet testID={testID}>{children}</mock-bottomsheet>
        ) : (
          children
        )}
      </>
    )),
  }),
);

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => ({
    __esModule: true,
    default: jest.fn(({ children }) => <>{children}</>),
  }),
);

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: string[]) => args }),
}));

describe('AccessRestrictedModal', () => {
  const defaultProps = {
    isVisible: true,
    onClose: jest.fn(),
    onContactSupport: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when isVisible is false', () => {
    const { queryByTestId } = render(
      <AccessRestrictedModal {...defaultProps} isVisible={false} />,
    );

    expect(
      queryByTestId(AccessRestrictedModalSelectorsIDs.BOTTOM_SHEET),
    ).toBeNull();
  });

  it('renders the modal with title and description when visible', () => {
    const { getByTestId } = render(<AccessRestrictedModal {...defaultProps} />);

    expect(getByTestId(AccessRestrictedModalSelectorsIDs.TITLE)).toBeTruthy();
    expect(
      getByTestId(AccessRestrictedModalSelectorsIDs.DESCRIPTION),
    ).toBeTruthy();
    expect(
      getByTestId(AccessRestrictedModalSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    ).toBeTruthy();
  });

  it('calls onContactSupport when pressing the contact support button', () => {
    const { getByTestId } = render(<AccessRestrictedModal {...defaultProps} />);

    fireEvent.press(
      getByTestId(AccessRestrictedModalSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    );

    expect(defaultProps.onContactSupport).toHaveBeenCalledTimes(1);
  });
});
