import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useMemo,
  ReactNode,
} from 'react';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../constants/urls';
import AccessRestrictedModal from '../AccessRestrictedModal';

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

  const showAccessRestrictedModal = useCallback(() => {
    notificationAsync(NotificationFeedbackType.Warning);
    setIsVisible(true);
  }, []);

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
