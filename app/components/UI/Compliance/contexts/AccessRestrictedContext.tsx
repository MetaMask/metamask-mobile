import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useMemo,
  ReactNode,
} from 'react';
import { playWarningNotification } from '../../../../util/haptics';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../constants/urls';
import { useSupportConsent } from '../../../hooks/useSupportConsent';
import AccessRestrictedModal from '../AccessRestrictedModal';
import { usePerpsEventTracking } from '../../Perps/hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';

interface AccessRestrictedContextType {
  showAccessRestrictedModal: () => void;
  hideAccessRestrictedModal: () => void;
  isAccessRestricted: boolean;
}

const AccessRestrictedContext =
  createContext<AccessRestrictedContextType | null>(null);

interface AccessRestrictedProviderProps {
  children: ReactNode;
}

export const AccessRestrictedProvider = ({
  children,
}: AccessRestrictedProviderProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const navigation = useNavigation<AppNavigationProp>();
  const { track } = usePerpsEventTracking();
  const { openSupportWithConsent } = useSupportConsent();

  const showAccessRestrictedModal = useCallback(() => {
    playWarningNotification();
    setIsVisible(true);
    track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
        PERPS_EVENT_VALUE.SCREEN_TYPE.COMPLIANCE_BLOCK_NOTIF,
    });
  }, [track]);

  const hideAccessRestrictedModal = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleContactSupport = useCallback(() => {
    hideAccessRestrictedModal();
    openSupportWithConsent(
      (url) =>
        navigation.navigate(Routes.WEBVIEW.MAIN, {
          screen: Routes.WEBVIEW.SIMPLE,
          params: {
            url,
            title: strings('access_restricted.contact_support'),
          },
        }),
      METAMASK_SUPPORT_URL,
    );
  }, [hideAccessRestrictedModal, navigation, openSupportWithConsent]);

  const value = useMemo(
    () => ({
      showAccessRestrictedModal,
      hideAccessRestrictedModal,
      isAccessRestricted: isVisible,
    }),
    [showAccessRestrictedModal, hideAccessRestrictedModal, isVisible],
  );

  return (
    <AccessRestrictedContext.Provider value={value}>
      {children}
      <AccessRestrictedModal
        isVisible={isVisible}
        onClose={hideAccessRestrictedModal}
        onContactSupport={handleContactSupport}
      />
    </AccessRestrictedContext.Provider>
  );
};

export const useAccessRestrictedModal = (): AccessRestrictedContextType => {
  const context = useContext(AccessRestrictedContext);
  if (!context) {
    throw new Error(
      'useAccessRestrictedModal must be used within an AccessRestrictedProvider',
    );
  }
  return context;
};

const NO_OP_ACCESS_RESTRICTED: AccessRestrictedContextType = {
  showAccessRestrictedModal: () => undefined,
  hideAccessRestrictedModal: () => undefined,
  isAccessRestricted: false,
};

/**
 * Feed cards call the compliance gate on every render. The app root already
 * provides this context; surfaces rendered without it (unit tests, and any
 * shell mounted outside the root) get a no-op so the card still paints.
 * A blocked wallet still does not proceed — the gate returns before the action.
 */
export const EnsureAccessRestricted = ({
  children,
}: {
  children: ReactNode;
}) => {
  const existing = useContext(AccessRestrictedContext);
  if (existing) {
    return children;
  }
  return (
    <AccessRestrictedContext.Provider value={NO_OP_ACCESS_RESTRICTED}>
      {children}
    </AccessRestrictedContext.Provider>
  );
};
