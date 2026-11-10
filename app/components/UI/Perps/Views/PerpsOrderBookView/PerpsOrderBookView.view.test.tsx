/**
 * Component view tests for PerpsOrderBookView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  defaultPositionForViews,
  renderPerpsOrderBookView,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsOrderBookViewSelectorsIDs } from '../../Perps.testIds';

const ineligibleOverrides = {
  engine: {
    backgroundState: {
      PerpsController: { isEligible: false },
    },
  },
};

describe('PerpsOrderBookView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Long and Short buttons when there is no existing position', async () => {
    renderPerpsOrderBookView({ streamOverrides: { positions: [] } });

    expect(
      await screen.findByTestId(PerpsOrderBookViewSelectorsIDs.LONG_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsOrderBookViewSelectorsIDs.SHORT_BUTTON),
    ).toBeOnTheScreen();

    // Long/Short labels are correct
    expect(screen.getByText(strings('perps.market.long'))).toBeOnTheScreen();
    expect(screen.getByText(strings('perps.market.short'))).toBeOnTheScreen();
  });

  it('ineligible user pressing Long shows the geo-block tooltip', async () => {
    renderPerpsOrderBookView({
      overrides: ineligibleOverrides,
      streamOverrides: { positions: [] },
    });

    const longButton = await screen.findByTestId(
      PerpsOrderBookViewSelectorsIDs.LONG_BUTTON,
    );
    expect(longButton).toBeOnTheScreen();

    fireEvent.press(longButton);

    // Geo-block tooltip must appear after the press
    await waitFor(() => {
      expect(
        screen.getByTestId(
          `${PerpsOrderBookViewSelectorsIDs.CONTAINER}-geo-block-tooltip`,
        ),
      ).toBeOnTheScreen();
    });
  });

  it('existing position: Modify and Close buttons appear, and pressing Modify opens the action sheet', async () => {
    renderPerpsOrderBookView({
      streamOverrides: { positions: [defaultPositionForViews] },
    });

    // Both action buttons are visible
    const modifyButton = await screen.findByTestId(
      PerpsOrderBookViewSelectorsIDs.MODIFY_BUTTON,
    );
    expect(modifyButton).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsOrderBookViewSelectorsIDs.CLOSE_BUTTON),
    ).toBeOnTheScreen();

    // Pressing Modify opens the modify action sheet inline
    fireEvent.press(modifyButton);

    await waitFor(() => {
      expect(
        screen.getByTestId(PerpsOrderBookViewSelectorsIDs.MODIFY_ACTION_SHEET),
      ).toBeOnTheScreen();
    });
  });

  it('pressing the depth-band button opens the grouping selection sheet', async () => {
    renderPerpsOrderBookView();

    const depthBandButton = await screen.findByTestId(
      PerpsOrderBookViewSelectorsIDs.DEPTH_BAND_BUTTON,
    );
    expect(depthBandButton).toBeOnTheScreen();

    fireEvent.press(depthBandButton);

    await waitFor(() => {
      expect(
        screen.getByTestId(PerpsOrderBookViewSelectorsIDs.DEPTH_BAND_SHEET),
      ).toBeOnTheScreen();
    });
  });

  it('stream update: Long/Short are replaced by Modify/Close when a position arrives', async () => {
    const { stream } = renderPerpsOrderBookView({
      streamOverrides: { positions: [] },
    });

    // No position: Long and Short visible
    await screen.findByTestId(PerpsOrderBookViewSelectorsIDs.LONG_BUTTON);
    expect(
      screen.getByTestId(PerpsOrderBookViewSelectorsIDs.SHORT_BUTTON),
    ).toBeOnTheScreen();

    // Position arrives via stream
    act(() => {
      stream.emitPositions([defaultPositionForViews]);
    });

    // Long/Short disappear; Modify/Close take their place
    await waitFor(() => {
      expect(
        screen.queryByTestId(PerpsOrderBookViewSelectorsIDs.LONG_BUTTON),
      ).not.toBeOnTheScreen();
    });
    expect(
      screen.getByTestId(PerpsOrderBookViewSelectorsIDs.MODIFY_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsOrderBookViewSelectorsIDs.CLOSE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('unit toggle: switching to base currency keeps the toggle visible and control active', async () => {
    renderPerpsOrderBookView();

    // Both toggle options are rendered
    const usdTab = await screen.findByTestId(
      PerpsOrderBookViewSelectorsIDs.UNIT_TOGGLE_USD,
    );
    const baseTab = screen.getByTestId(
      PerpsOrderBookViewSelectorsIDs.UNIT_TOGGLE_BASE,
    );
    expect(usdTab).toBeOnTheScreen();
    expect(baseTab).toBeOnTheScreen();

    // Switch to base currency
    fireEvent.press(baseTab);

    // Toggle control is still rendered after the interaction
    expect(
      screen.getByTestId(PerpsOrderBookViewSelectorsIDs.UNIT_TOGGLE),
    ).toBeOnTheScreen();
  });
});
