import React from 'react';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import RampsServiceDisruptionModal, {
  createRampsServiceDisruptionModalNavigationDetails,
} from './RampsServiceDisruptionModal';
import Routes from '../../../../../constants/navigation/Routes';
import initialRootState from '../../../../../util/test/initial-root-state';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { RAMPS_SERVICE_DISRUPTION_MODAL_TEST_IDS } from './RampsServiceDisruptionModal.testIds';

const mockOnCloseBottomSheet = jest.fn();

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    BottomSheet: ReactActual.forwardRef(
      (
        { children, testID }: { children: React.ReactNode; testID?: string },
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
    { name: Routes.SHEET.RAMPS_SERVICE_DISRUPTION_MODAL },
    { state: initialRootState },
  );
}

describe('createRampsServiceDisruptionModalNavigationDetails', () => {
  it('targets root modal flow and the ramp service disruption sheet', () => {
    const details = createRampsServiceDisruptionModalNavigationDetails();
    expect(details[0]).toBe(Routes.MODAL.ROOT_MODAL_FLOW);
    expect(details[1]).toEqual(
      expect.objectContaining({
        screen: Routes.SHEET.RAMPS_SERVICE_DISRUPTION_MODAL,
      }),
    );
  });
});

describe('RampsServiceDisruptionModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders title, description and sheet testID', () => {
    render(RampsServiceDisruptionModal);
    expect(
      screen.getByTestId(RAMPS_SERVICE_DISRUPTION_MODAL_TEST_IDS.MODAL),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('fiat_on_ramp_aggregator.service_disruption_modal.title'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('fiat_on_ramp_aggregator.service_disruption_modal.description'),
      ),
    ).toBeOnTheScreen();
  });

  it('closes when the header close button is pressed', () => {
    render(RampsServiceDisruptionModal);
    fireEvent.press(
      screen.getByTestId(RAMPS_SERVICE_DISRUPTION_MODAL_TEST_IDS.CLOSE_BUTTON),
    );
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('closes when the got it button is pressed', () => {
    render(RampsServiceDisruptionModal);
    fireEvent.press(
      screen.getByText(
        strings('fiat_on_ramp_aggregator.service_disruption_modal.got_it'),
      ),
    );
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
