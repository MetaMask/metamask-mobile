import React from 'react';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import UnsupportedTokenModal from './UnsupportedTokenModal';
import Routes from '../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../util/test/initial-root-state';
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
      name: Routes.RAMP.MODALS.UNSUPPORTED_TOKEN,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('UnsupportedTokenModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with correct title and description', () => {
    const { toJSON } = render(UnsupportedTokenModal);

    expect(toJSON()).toMatchSnapshot();
  });

  it('closes the modal when the close button is pressed', () => {
    const { getByTestId } = render(UnsupportedTokenModal);
    const closeButton = getByTestId('bottomsheetheader-close-button');

    fireEvent.press(closeButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
