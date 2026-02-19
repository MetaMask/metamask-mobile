/**
 * Component view tests for PerpsBadge.
 * Tests all badge types render their correct i18n labels and custom label override.
 * State-driven via Redux; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsBadge.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsComponent } from '../../../../../util/test/component-view/renderers/perpsViewRenderer';
import PerpsBadge from './PerpsBadge';

type BadgeType = 'experimental' | 'equity' | 'commodity' | 'crypto' | 'forex';

const renderBadge = (type: BadgeType, customLabel?: string) =>
  renderPerpsComponent(
    PerpsBadge as unknown as React.ComponentType<Record<string, unknown>>,
    { type, customLabel },
  );

describe('PerpsBadge', () => {
  const badgeTypes: BadgeType[] = [
    'experimental',
    'equity',
    'commodity',
    'crypto',
    'forex',
  ];

  it.each(badgeTypes)(
    'renders correct label for %s badge type',
    async (type) => {
      renderBadge(type);

      expect(
        await screen.findByText(strings(`perps.market.badge.${type}`)),
      ).toBeOnTheScreen();
    },
  );

  it('renders custom label when provided, overriding the default', async () => {
    renderBadge('crypto', 'CUSTOM');

    expect(await screen.findByText('CUSTOM')).toBeOnTheScreen();
  });
});
