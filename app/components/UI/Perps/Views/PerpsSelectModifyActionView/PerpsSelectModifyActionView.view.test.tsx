/**
 * Component view tests for PerpsSelectModifyActionView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsSelectModifyActionView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsModifyActionSheetSelectorsIDs } from '../../Perps.testIds';

const TIMEOUT_MS = 5000;

describe('PerpsSelectModifyActionView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the modify action sheet with all three action options', async () => {
    renderPerpsSelectModifyActionView();

    expect(
      await screen.findByTestId(PerpsModifyActionSheetSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsModifyActionSheetSelectorsIDs.ADD_TO_POSITION),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsModifyActionSheetSelectorsIDs.REDUCE_POSITION),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsModifyActionSheetSelectorsIDs.FLIP_POSITION),
    ).toBeOnTheScreen();
  });

  it('shows the sheet title', async () => {
    renderPerpsSelectModifyActionView();

    expect(
      await screen.findByText(strings('perps.modify.title')),
    ).toBeOnTheScreen();
  });

  it('shows the Add to Position label', async () => {
    renderPerpsSelectModifyActionView();

    expect(
      await screen.findByText(strings('perps.modify.add_to_position')),
    ).toBeOnTheScreen();
  });

  it('shows the Reduce Position label', async () => {
    renderPerpsSelectModifyActionView();

    expect(
      await screen.findByText(strings('perps.modify.reduce_position')),
    ).toBeOnTheScreen();
  });

  it('shows the Flip Position label', async () => {
    renderPerpsSelectModifyActionView();

    expect(
      await screen.findByText(strings('perps.modify.flip_position')),
    ).toBeOnTheScreen();
  });

  it('pressing Add to Position navigates to the order confirmation screen', async () => {
    renderPerpsSelectModifyActionView();

    fireEvent.press(
      await screen.findByTestId(
        PerpsModifyActionSheetSelectorsIDs.ADD_TO_POSITION,
        {},
        { timeout: TIMEOUT_MS },
      ),
    );

    // The renderer pre-registers the confirmation route with a probe element.
    expect(
      await screen.findByTestId('route-order-confirmation', {}, { timeout: TIMEOUT_MS }),
    ).toBeOnTheScreen();
  });
});
