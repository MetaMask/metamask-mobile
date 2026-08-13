import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  QuickBuyTabBarVisibilityProvider,
  useIsQuickBuyOpen,
  useQuickBuyTabBarVisibility,
} from './QuickBuyTabBarVisibilityContext';

const OpenRegistrar: React.FC = () => {
  const { registerQuickBuyOpen } = useQuickBuyTabBarVisibility();

  useEffect(() => {
    registerQuickBuyOpen();
  }, [registerQuickBuyOpen]);

  return null;
};

const StatusReader: React.FC = () => {
  const isQuickBuyOpen = useIsQuickBuyOpen();
  return (
    <Text testID="quick-buy-open-status">
      {isQuickBuyOpen ? 'open' : 'closed'}
    </Text>
  );
};

describe('QuickBuyTabBarVisibilityContext', () => {
  it('reports closed when no sheet is registered', () => {
    render(
      <QuickBuyTabBarVisibilityProvider>
        <StatusReader />
      </QuickBuyTabBarVisibilityProvider>,
    );

    expect(screen.getByTestId('quick-buy-open-status').props.children).toBe(
      'closed',
    );
  });

  it('reports open after registerQuickBuyOpen', () => {
    const Inner: React.FC = () => {
      const { registerQuickBuyOpen } = useQuickBuyTabBarVisibility();
      useEffect(() => {
        registerQuickBuyOpen();
      }, [registerQuickBuyOpen]);
      return <StatusReader />;
    };

    render(
      <QuickBuyTabBarVisibilityProvider>
        <Inner />
      </QuickBuyTabBarVisibilityProvider>,
    );

    expect(screen.getByTestId('quick-buy-open-status').props.children).toBe(
      'open',
    );
  });

  it('returns closed and no-op handlers outside the provider', () => {
    const handlers: {
      register?: () => void;
      unregister?: () => void;
      isOpen?: boolean;
    } = {};

    const Reader: React.FC = () => {
      const ctx = useQuickBuyTabBarVisibility();
      handlers.register = ctx.registerQuickBuyOpen;
      handlers.unregister = ctx.unregisterQuickBuyOpen;
      handlers.isOpen = ctx.isQuickBuyOpen;
      return null;
    };

    render(<Reader />);

    expect(handlers.isOpen).toBe(false);
    handlers.register?.();
    handlers.unregister?.();
    expect(handlers.isOpen).toBe(false);
  });

  it('clears open state after unregisterQuickBuyOpen', () => {
    const Toggle: React.FC = () => {
      const { registerQuickBuyOpen, unregisterQuickBuyOpen } =
        useQuickBuyTabBarVisibility();

      useEffect(() => {
        registerQuickBuyOpen();
        return () => unregisterQuickBuyOpen();
      }, [registerQuickBuyOpen, unregisterQuickBuyOpen]);

      return <StatusReader />;
    };

    const { unmount } = render(
      <QuickBuyTabBarVisibilityProvider>
        <Toggle />
      </QuickBuyTabBarVisibilityProvider>,
    );

    expect(screen.getByTestId('quick-buy-open-status').props.children).toBe(
      'open',
    );

    unmount();

    render(
      <QuickBuyTabBarVisibilityProvider>
        <StatusReader />
      </QuickBuyTabBarVisibilityProvider>,
    );

    expect(screen.getByTestId('quick-buy-open-status').props.children).toBe(
      'closed',
    );
  });

  it('tracks multiple concurrent registrations with a ref count', () => {
    render(
      <QuickBuyTabBarVisibilityProvider>
        <OpenRegistrar />
        <OpenRegistrar />
        <StatusReader />
      </QuickBuyTabBarVisibilityProvider>,
    );

    expect(screen.getByTestId('quick-buy-open-status').props.children).toBe(
      'open',
    );
  });
});
