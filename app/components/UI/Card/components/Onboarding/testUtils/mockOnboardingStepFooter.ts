import React from 'react';

interface MockFooterProps {
  footerContent?: React.ReactNode;
  primaryButtonProps?: Record<string, unknown>;
  secondaryButtonProps?: Record<string, unknown>;
  tertiaryButtonProps?: Record<string, unknown>;
}

/**
 * Test-only helper for `jest.mock('./OnboardingStep')` factories. Renders the
 * footer content and button props as the test file's (possibly mocked) MMDS `Button`s, so
 * screens can be asserted on the same testIDs and handlers as before.
 * Returns null when a step has no footer content or buttons.
 *
 * @param props - The OnboardingStep props passed to the mock.
 * @returns The footer buttons, or null.
 */
export const mockRenderFooterButtons = (props: MockFooterProps) => {
  // Resolved at call time so the calling test's DS mock is used.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const designSystem = require('@metamask/design-system-react-native');
  const { Button, ButtonVariant } = designSystem;
  const buttons = (
    [
      ['primary', props.primaryButtonProps, ButtonVariant?.Primary],
      ['secondary', props.secondaryButtonProps, ButtonVariant?.Secondary],
      ['tertiary', props.tertiaryButtonProps, ButtonVariant?.Tertiary],
    ] as const
  )
    .filter(([, buttonProps]) => Boolean(buttonProps))
    .map(([key, buttonProps, variant]) =>
      React.createElement(Button, { key, variant, ...buttonProps }),
    );
  const items: React.ReactNode[] = props.footerContent
    ? [
        React.createElement(
          React.Fragment,
          { key: 'footer-content' },
          props.footerContent,
        ),
        ...buttons,
      ]
    : buttons;
  return items.length ? items : null;
};
