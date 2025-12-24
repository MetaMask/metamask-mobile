import React from 'react';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import EligibilityFailedModal from './EligibilityFailedModal';
import Routes from '../../../../../constants/navigation/Routes';
import initialRootState from '../../../../../util/test/initial-root-state';
import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

const mockOnCloseBottomSheet = jest.fn();

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(undefined),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  canOpenURL: jest.fn().mockResolvedValue(true),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    return ReactActual.forwardRef(
      (
        {
          children,
        }: {
          children: React.ReactNode;
        },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));
        return <>{children}</>;
      },
    );
  },
);

function render(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: Routes.SHEET.ELIGIBILITY_FAILED_MODAL,
    },
    {
      state: initialRootState,
    },
  );
}

describe('EligibilityFailedModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal with title and description', () => {
    const { toJSON } = render(EligibilityFailedModal);

    expect(toJSON()).toMatchSnapshot();
  });
  it('navigates to contact support when the contact support button is pressed', () => {
    const { getByText } = render(EligibilityFailedModal);
    const contactSupportButton = getByText('Contact support');

    fireEvent.press(contactSupportButton);

    expect(Linking.openURL).toHaveBeenCalledWith('https://support.metamask.io');
  });

  it('closes the modal when the close button is pressed', () => {
    const { getByTestId } = render(EligibilityFailedModal);
    const closeButton = getByTestId('bottomsheetheader-close-button');

    fireEvent.press(closeButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('closes the modal when the got it button is pressed', () => {
    const { getByText } = render(EligibilityFailedModal);
    const gotItButton = getByText('Got it');

    fireEvent.press(gotItButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
