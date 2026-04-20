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
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../constants/urls';
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
  const navigation = useNavigation();
  const { track } = usePerpsEventTracking();

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
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: METAMASK_SUPPORT_URL,
        title: strings('access_restricted.contact_support'),
      },
    });
  }, [hideAccessRestrictedModal, navigation]);

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
