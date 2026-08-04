import React, { ReactNode } from 'react';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { useConfirmationContext } from '../../../context/confirmation-context';

/**
 * Optional overrides for navbar customization.
 */
export interface NavbarOverrides {
  headerTitle?: () => ReactNode;
  /** Custom header left component. Receives onBackPress for rejection handling. */
  headerLeft?: (onBackPress: () => void) => ReactNode;
  /** Custom header right component. */
  headerRight?: (onPress: () => void) => ReactNode;
}

export interface ConfirmationNavHeaderConfig {
  title: string;
  addBackButton?: boolean;
  overrides?: NavbarOverrides;
}

export interface ConfirmationHeaderProps extends ConfirmationNavHeaderConfig {
  onReject?: () => void;
  mmPayRequestInProgressNavHandler?: React.RefObject<(() => void) | false>;
}

/**
 * Inline confirmation header (MMDS HeaderStandard). Prefer this over the React
 * Navigation stack header so the title transitions with screen content.
 */
export function ConfirmationHeader({
  title,
  onReject,
  addBackButton = true,
  overrides,
  mmPayRequestInProgressNavHandler,
}: ConfirmationHeaderProps) {
  function handleBackPress() {
    if (mmPayRequestInProgressNavHandler?.current) {
      mmPayRequestInProgressNavHandler.current();
      return;
    }
    if (onReject) {
      onReject();
    }
  }

  const customTitle = overrides?.headerTitle?.();
  const customLeft = overrides?.headerLeft
    ? overrides.headerLeft(handleBackPress)
    : undefined;
  const customRight = overrides?.headerRight
    ? overrides.headerRight(handleBackPress)
    : undefined;

  return (
    <HeaderStandard
      title={title}
      onBack={addBackButton ? handleBackPress : undefined}
      backButtonProps={
        addBackButton
          ? {
              testID: `${title}-navbar-back-button`,
              accessibilityLabel: strings('navigation.back'),
            }
          : undefined
      }
      startAccessory={customLeft}
      endAccessory={customRight}
      includesTopInset
    >
      {customTitle}
    </HeaderStandard>
  );
}

/**
 * Renders {@link ConfirmationHeader} using confirmation reject / MM Pay back
 * handlers from context.
 */
export function ConfirmationNavHeader(props: ConfirmationNavHeaderConfig) {
  const { onReject } = useConfirmActions();
  const { mmPayRequestInProgressNavHandler } = useConfirmationContext();

  return (
    <ConfirmationHeader
      {...props}
      onReject={onReject}
      mmPayRequestInProgressNavHandler={mmPayRequestInProgressNavHandler}
    />
  );
}

/** @deprecated Prefer inline {@link ConfirmationHeader}; kept for empty-header helpers/tests. */
export interface NavbarOptions {
  title: string;
  onReject?: () => void;
  addBackButton?: boolean;
  /** @deprecated No longer used. */
  theme?: unknown;
  overrides?: NavbarOverrides;
  mmPayRequestInProgressNavHandler?: React.RefObject<(() => void) | false>;
}

/** @deprecated Prefer inline {@link ConfirmationHeader}. */
export function getNavbar(options: NavbarOptions) {
  return {
    header: () => <ConfirmationHeader {...options} />,
  };
}

export function getEmptyNavHeader() {
  return {
    headerShown: false,
    gestureEnabled: false,
  };
}

export function getModalNavigationOptions() {
  return {
    title: '',
    headerLeft: () => null,
    headerTransparent: true,
    headerRight: () => null,
  };
}
