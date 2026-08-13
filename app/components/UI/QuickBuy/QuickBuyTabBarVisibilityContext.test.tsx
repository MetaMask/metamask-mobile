import React, { useEffect } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import {
  QuickBuyTabBarVisibilityProvider,
  useIsQuickBuyOpen,
  useQuickBuyTabBarVisibility,
} from './QuickBuyTabBarVisibilityContext';

const StatusReader: React.FC = () => {
  const isQuickBuyOpen = useIsQuickBuyOpen();
  return (
    <Text testID="quick-buy-open-status">
      {isQuickBuyOpen ? 'open' : 'closed'}
    </Text>
  );
};

const SheetRegistrar: React.FC<{ testID: string }> = ({ testID }) => {
  const { registerQuickBuyOpen, unregisterQuickBuyOpen } =
    useQuickBuyTabBarVisibility();

  useEffect(() => {
    registerQuickBuyOpen();
    return () => unregisterQuickBuyOpen();
  }, [registerQuickBuyOpen, unregisterQuickBuyOpen]);

  return <Text testID={testID} />;
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

  it('clears open state after unregisterQuickBuyOpen within the same provider', () => {
    const Controller: React.FC = () => {
      const { registerQuickBuyOpen, unregisterQuickBuyOpen } =
        useQuickBuyTabBarVisibility();

      return (
        <>
          <StatusReader />
          <Pressable
            testID="register-quick-buy"
            onPress={() => registerQuickBuyOpen()}
          />
          <Pressable
            testID="unregister-quick-buy"
            onPress={() => unregisterQuickBuyOpen()}
          />
        </>
      );
    };

    render(
      <QuickBuyTabBarVisibilityProvider>
        <Controller />
      </QuickBuyTabBarVisibilityProvider>,
    );

    expect(screen.getByTestId('quick-buy-open-status').props.children).toBe(
      'closed',
    );

    fireEvent.press(screen.getByTestId('register-quick-buy'));
    expect(screen.getByTestId('quick-buy-open-status').props.children).toBe(
      'open',
    );

    fireEvent.press(screen.getByTestId('unregister-quick-buy'));
    expect(screen.getByTestId('quick-buy-open-status').props.children).toBe(
      'closed',
    );
  });

  it('keeps tab bar hidden until all concurrent sheets unregister', () => {
    const { rerender } = render(
      <QuickBuyTabBarVisibilityProvider>
        <SheetRegistrar testID="sheet-a" />
        <SheetRegistrar testID="sheet-b" />
        <StatusReader />
      </QuickBuyTabBarVisibilityProvider>,
    );

    expect(screen.getByTestId('quick-buy-open-status').props.children).toBe(
      'open',
    );

    rerender(
      <QuickBuyTabBarVisibilityProvider>
        <SheetRegistrar testID="sheet-b" />
        <StatusReader />
      </QuickBuyTabBarVisibilityProvider>,
    );

    expect(screen.getByTestId('quick-buy-open-status').props.children).toBe(
      'open',
    );

    rerender(
      <QuickBuyTabBarVisibilityProvider>
        <StatusReader />
      </QuickBuyTabBarVisibilityProvider>,
    );

    expect(screen.getByTestId('quick-buy-open-status').props.children).toBe(
      'closed',
    );
  });
});
