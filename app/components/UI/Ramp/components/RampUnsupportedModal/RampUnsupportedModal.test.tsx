import React from 'react';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import RampUnsupportedModal from './RampUnsupportedModal';
import Routes from '../../../../../constants/navigation/Routes';
import initialRootState from '../../../../../util/test/initial-root-state';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
const mockOnCloseBottomSheet = jest.fn();

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    BottomSheet: ReactActual.forwardRef(
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
    ),
  };
});

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
    render(RampUnsupportedModal);

    expect(
      screen.getByText(
        strings('fiat_on_ramp_aggregator.unsupported_region_modal.title'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('fiat_on_ramp_aggregator.unsupported_region_modal.description'),
      ),
    ).toBeOnTheScreen();
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
