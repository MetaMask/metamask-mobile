/**
 * Component view tests for PerpsEmptyState.
 * State-driven via Redux (initialStatePerps); uses perps view renderer.
 * Run with: yarn test:view --testPathPattern="PerpsEmptyState.view.test"
 */
import React from 'react';
import '../../../../../../tests/component-view/mocks';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsEmptyState } from './PerpsEmptyState';

const PerpsEmptyStateScreen = () => (
  <PerpsEmptyState onAction={() => undefined} />
);

describe('PerpsEmptyState', () => {
  it('renders description and start trading button', async () => {
    renderPerpsView(
      PerpsEmptyStateScreen as unknown as React.ComponentType,
      'PerpsEmptyState',
      {},
    );

    expect(
      await screen.findByText(
        strings('perps.position.list.first_time_description'),
      ),
    ).toBeOnTheScreen();
    expect(
      await screen.findByText(strings('perps.position.list.start_trading')),
    ).toBeOnTheScreen();
  });

  it('calls onAction when start trading button is pressed', async () => {
    const onAction = jest.fn();
    const ScreenWithCallback = () => <PerpsEmptyState onAction={onAction} />;

    renderPerpsView(
      ScreenWithCallback as unknown as React.ComponentType,
      'PerpsEmptyState',
      {},
    );

    const button = await screen.findByText(
      strings('perps.position.list.start_trading'),
    );
    fireEvent.press(button);

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('keeps description and button visible after pressing start trading (state unchanged)', async () => {
    const onAction = jest.fn();
    const ScreenWithCallback = () => <PerpsEmptyState onAction={onAction} />;

    renderPerpsView(
      ScreenWithCallback as unknown as React.ComponentType,
      'PerpsEmptyState',
      {},
    );

    const button = await screen.findByText(
      strings('perps.position.list.start_trading'),
    );
    fireEvent.press(button);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(strings('perps.position.list.first_time_description')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.position.list.start_trading')),
    ).toBeOnTheScreen();
  });
});
