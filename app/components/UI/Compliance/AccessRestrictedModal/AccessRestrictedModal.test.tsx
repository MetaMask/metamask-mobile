import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AccessRestrictedModal from './AccessRestrictedModal';
import { AccessRestrictedModalSelectorsIDs } from './AccessRestrictedModal.testIds';

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require('react-native');
    return {
      __esModule: true,
      default: jest.fn(
        ({
          children,
          testID,
        }: {
          children: React.ReactNode;
          testID?: string;
        }) => <View testID={testID}>{children}</View>,
      ),
    };
  },
);

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

    expect(
      getByTestId(AccessRestrictedModalSelectorsIDs.TITLE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(AccessRestrictedModalSelectorsIDs.DESCRIPTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(AccessRestrictedModalSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    ).toBeOnTheScreen();
  });

  it('calls onContactSupport when pressing the contact support button', () => {
    const { getByTestId } = render(<AccessRestrictedModal {...defaultProps} />);

    fireEvent.press(
      getByTestId(AccessRestrictedModalSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    );

    expect(defaultProps.onContactSupport).toHaveBeenCalledTimes(1);
  });
});
