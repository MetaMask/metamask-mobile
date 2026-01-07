import React from 'react';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import RampUnsupportedModal from './RampUnsupportedModal';
import Routes from '../../../../../constants/navigation/Routes';
import initialRootState from '../../../../../util/test/initial-root-state';
import { fireEvent } from '@testing-library/react-native';
const mockOnCloseBottomSheet = jest.fn();

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
      name: Routes.SHEET.UNSUPPORTED_REGION_MODAL,
    },
    {
      state: initialRootState,
    },
  );
}

describe('RampUnsupportedModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal with title and description', () => {
    const component = render(RampUnsupportedModal);

    const result = component.toJSON();

    expect(result).toMatchSnapshot();
  });

  it('closes the modal when the close button is pressed', () => {
    const { getByTestId } = render(RampUnsupportedModal);
    const closeButton = getByTestId('bottomsheetheader-close-button');

    fireEvent.press(closeButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('closes the modal when the got it button is pressed', () => {
    const { getByText } = render(RampUnsupportedModal);
    const gotItButton = getByText('Got it');

    fireEvent.press(gotItButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
