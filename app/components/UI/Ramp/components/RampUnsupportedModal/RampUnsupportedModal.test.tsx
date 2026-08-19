import React from 'react';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import RampUnsupportedModal, {
  createRampUnsupportedModalNavigationDetails,
} from './RampUnsupportedModal';
import Routes from '../../../../../constants/navigation/Routes';
import initialRootState from '../../../../../util/test/initial-root-state';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { RAMP_UNSUPPORTED_MODAL_TEST_IDS } from './RampUnsupportedModal.testIds';

const mockOnCloseBottomSheet = jest.fn();

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    BottomSheet: ReactActual.forwardRef(
      (
        {
          children,
          testID,
        }: {
          children: React.ReactNode;
          testID?: string;
        },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));
        return <View testID={testID}>{children}</View>;
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

describe('createRampUnsupportedModalNavigationDetails', () => {
  it('targets root modal flow and unsupported region sheet', () => {
    const details = createRampUnsupportedModalNavigationDetails();

    expect(details[0]).toBe(Routes.MODAL.ROOT_MODAL_FLOW);
    expect(details[1]).toEqual(
      expect.objectContaining({
        screen: Routes.SHEET.UNSUPPORTED_REGION_MODAL,
      }),
    );
  });
});

describe('RampUnsupportedModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal with title, description, and sheet testID', () => {
    render(RampUnsupportedModal);

    expect(
      screen.getByTestId(RAMP_UNSUPPORTED_MODAL_TEST_IDS.MODAL),
    ).toBeOnTheScreen();
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

  it('closes the modal when the header close button is pressed', () => {
    render(RampUnsupportedModal);
    const closeButton = screen.getByTestId(
      RAMP_UNSUPPORTED_MODAL_TEST_IDS.CLOSE_BUTTON,
    );

    fireEvent.press(closeButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('closes the modal when the got it button is pressed', () => {
    render(RampUnsupportedModal);
    const gotItLabel = strings(
      'fiat_on_ramp_aggregator.unsupported_region_modal.got_it',
    );
    const gotItButton = screen.getByText(gotItLabel);

    fireEvent.press(gotItButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
