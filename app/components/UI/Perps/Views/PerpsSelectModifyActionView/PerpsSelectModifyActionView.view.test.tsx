/**
 * Component view tests for PerpsSelectModifyActionView.
 * State-driven via Redux (initialStatePerps); no hook/selector mocks.
 * Run with: yarn jest -c jest.config.view.js PerpsSelectModifyActionView.view.test
 */
import '../../../../../util/test/component-view/mocks';
import { fireEvent, screen } from '@testing-library/react-native';
import { getModifyActionLabels } from '../../../../../util/test/component-view/helpers/perps';
import { renderPerpsSelectModifyActionView } from '../../../../../util/test/component-view/renderers/perps';

describe('PerpsSelectModifyActionView', () => {
  it('renders the modify action sheet with options', () => {
    renderPerpsSelectModifyActionView();
    const labels = getModifyActionLabels();

    expect(screen.getByText(labels.addPosition)).toBeOnTheScreen();
    expect(screen.getByText(labels.reducePosition)).toBeOnTheScreen();
    expect(screen.getByText(labels.flipPosition)).toBeOnTheScreen();
  });

  it('reduce position action runs without error (navigates then sheet closes)', () => {
    renderPerpsSelectModifyActionView();
    const labels = getModifyActionLabels();

    fireEvent.press(screen.getByText(labels.reducePosition));

    // Sheet closes after action (onClose), so we stay on modify screen; no throw
    expect(screen.getByText(labels.flipPosition)).toBeOnTheScreen();
  });
});
