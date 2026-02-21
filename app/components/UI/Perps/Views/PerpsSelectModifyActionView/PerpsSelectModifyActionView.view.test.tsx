/**
 * Component view tests for PerpsSelectModifyActionView.
 * State-driven via Redux (initialStatePerps); no hook/selector mocks.
 * Run with: yarn jest -c jest.config.view.js PerpsSelectModifyActionView.view.test
 */
import '../../../../../../tests/component-view/mocks';
import { fireEvent, screen } from '@testing-library/react-native';
import { getModifyActionLabels } from '../../../../../../tests/component-view/helpers/perpsViewTestHelpers';
import { renderPerpsSelectModifyActionView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import Routes from '../../../../../constants/navigation/Routes';

describe('PerpsSelectModifyActionView', () => {
  it('renders the modify action sheet with options', () => {
    renderPerpsSelectModifyActionView();
    const labels = getModifyActionLabels();

    expect(screen.getByText(labels.addPosition)).toBeOnTheScreen();
    expect(screen.getByText(labels.reducePosition)).toBeOnTheScreen();
    expect(screen.getByText(labels.flipPosition)).toBeOnTheScreen();
  });

  it('handles add to position action without runtime errors', async () => {
    renderPerpsSelectModifyActionView();
    const labels = getModifyActionLabels();

    fireEvent.press(screen.getByText(labels.addPosition));

    expect(
      await screen.findByTestId('route-order-confirmation'),
    ).toBeOnTheScreen();
  });

  it('handles reduce position action without runtime errors', async () => {
    renderPerpsSelectModifyActionView();
    const labels = getModifyActionLabels();

    fireEvent.press(screen.getByText(labels.reducePosition));

    expect(await screen.findByText(labels.flipPosition)).toBeOnTheScreen();
  });

  it('handles flip position action without runtime errors', async () => {
    renderPerpsSelectModifyActionView();
    const labels = getModifyActionLabels();

    fireEvent.press(screen.getByText(labels.flipPosition));

    expect(
      await screen.findByTestId('route-order-confirmation'),
    ).toBeOnTheScreen();
  });
});
