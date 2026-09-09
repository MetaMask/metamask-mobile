/**
 * Component view tests for PerpsSelectAdjustMarginActionView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  defaultPositionForViews,
  renderPerpsSelectAdjustMarginActionView,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsAdjustMarginActionSheetSelectorsIDs } from '../../Perps.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';

describe('PerpsSelectAdjustMarginActionView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows add margin and reduce margin action options', async () => {
    renderPerpsSelectAdjustMarginActionView();

    expect(
      await screen.findByTestId(
        PerpsAdjustMarginActionSheetSelectorsIDs.ADD_MARGIN_OPTION,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        PerpsAdjustMarginActionSheetSelectorsIDs.REDUCE_MARGIN_OPTION,
      ),
    ).toBeOnTheScreen();
  });

  it('shows the sheet title', async () => {
    renderPerpsSelectAdjustMarginActionView();

    expect(
      await screen.findByText(strings('perps.adjust_margin.title')),
    ).toBeOnTheScreen();
  });

  it('navigates to adjust margin when add margin is selected', async () => {
    const { findByTestId } = renderPerpsSelectAdjustMarginActionView({
      initialParams: {
        position: defaultPositionForViews,
      },
      extraRoutes: [{ name: Routes.PERPS.ADJUST_MARGIN }],
    });

    fireEvent.press(
      await screen.findByTestId(
        PerpsAdjustMarginActionSheetSelectorsIDs.ADD_MARGIN_OPTION,
      ),
    );

    await waitFor(() => {
      expect(
        findByTestId(getRouteProbeTestId(Routes.PERPS.ADJUST_MARGIN)),
      ).resolves.toBeOnTheScreen();
    });
  });
});
