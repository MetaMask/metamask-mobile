/**
 * Component view tests for PerpsHomeView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsHomeView.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  renderPerpsHomeView,
  defaultPositionForViews,
} from '../../../../../util/test/component-view/renderers/perpsViewRenderer';

describe('PerpsHomeView', () => {
  it('renders header and back button when connected', async () => {
    renderPerpsHomeView();

    expect(await screen.findByTestId('perps-home')).toBeOnTheScreen();
    expect(
      await screen.findByTestId('perps-home-back-button'),
    ).toBeOnTheScreen();
  });

  it('with stream data: positions section title is visible', async () => {
    renderPerpsHomeView({
      streamOverrides: { positions: [defaultPositionForViews] },
    });

    expect(
      await screen.findByText(strings('perps.home.positions')),
    ).toBeOnTheScreen();
  });

  it('with positions and not eligible: pressing Positions section action shows geo block tooltip', async () => {
    renderPerpsHomeView({
      overrides: {
        engine: {
          backgroundState: {
            PerpsController: { isEligible: false },
          },
        },
      },
      streamOverrides: { positions: [defaultPositionForViews] },
    });

    const positionsTitle = await screen.findByText(
      strings('perps.home.positions'),
    );
    expect(positionsTitle).toBeOnTheScreen();
    fireEvent.press(positionsTitle);

    expect(
      await screen.findByTestId('perps-home-close-all-geo-block-tooltip'),
    ).toBeOnTheScreen();
  });

  it('with positions and eligible: header and positions section visible', async () => {
    renderPerpsHomeView({
      overrides: {
        engine: {
          backgroundState: {
            PerpsController: { isEligible: true },
          },
        },
      },
      streamOverrides: { positions: [defaultPositionForViews] },
    });

    expect(await screen.findByTestId('perps-home')).toBeOnTheScreen();
    expect(
      await screen.findByText(strings('perps.home.positions')),
    ).toBeOnTheScreen();
  });
});
