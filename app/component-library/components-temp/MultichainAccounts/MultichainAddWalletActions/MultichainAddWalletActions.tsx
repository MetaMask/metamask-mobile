// Third party dependencies.
import React, { Fragment, useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import { IconName } from '@metamask/design-system-react-native';
import ActionListItem from '../../ActionListItem';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { IMetaMetricsEvent } from '../../../../core/Analytics/MetaMetrics.types';
import Routes from '../../../../constants/navigation/Routes';
import { useMetrics } from '../../../../components/hooks/useMetrics';
import { AddAccountBottomSheetSelectorsIDs } from '../../../../components/Views/AddAccountActions/AddAccountBottomSheet.testIds';

// Types
import { MultichainAddWalletActionsProps } from './MultichainAddWalletActions.types';

// Internal types
interface ActionConfig {
  type: string;
  label: string;
  iconName: IconName;
  testID: string;
  isVisible: boolean;
  analyticsEvent: IMetaMetricsEvent;
  navigationAction: () => void;
}

const MultichainAddWalletActions = ({
  onBack,
}: MultichainAddWalletActionsProps) => {
  const { navigate } = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const createActionHandler = useCallback(
    (config: Omit<ActionConfig, 'isVisible'>) => () => {
      config.navigationAction();

      trackEvent(createEventBuilder(config.analyticsEvent).build());
    },
    [trackEvent, createEventBuilder],
  );

  const actionConfigs: ActionConfig[] = useMemo(
    () => [
      {
        type: 'import_wallet',
        label: strings('account_actions.import_wallet'),
        iconName: IconName.Wallet,
        testID: AddAccountBottomSheetSelectorsIDs.IMPORT_SRP_BUTTON,
        isVisible: true,
        analyticsEvent: MetaMetricsEvents.IMPORT_SECRET_RECOVERY_PHRASE_CLICKED,
        navigationAction: () => {
          navigate(Routes.MULTI_SRP.IMPORT);
          onBack();
        },
      },
      {
        type: 'import_account',
        label: strings('accounts.import_account'),
        iconName: IconName.Download,
        testID: AddAccountBottomSheetSelectorsIDs.IMPORT_ACCOUNT_BUTTON,
        isVisible: true,
        analyticsEvent: MetaMetricsEvents.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
        navigationAction: () => {
          navigate('ImportPrivateKeyView');
          onBack();
        },
      },
      {
        type: 'hardware_wallet',
        label: strings('multichain_accounts.add_hardware_wallet'),
        iconName: IconName.Usb,
        testID: AddAccountBottomSheetSelectorsIDs.ADD_HARDWARE_WALLET_BUTTON,
        isVisible: true,
        analyticsEvent: MetaMetricsEvents.ADD_HARDWARE_WALLET,
        navigationAction: () => {
          navigate(Routes.HW.CONNECT);
          onBack();
        },
      },
    ],
    [navigate, onBack],
  );

  return (
    <SafeAreaView>
      <Fragment>
        {actionConfigs.map(
          (config) =>
            config.isVisible && (
              <ActionListItem
                key={config.type}
                label={config.label}
                iconName={config.iconName}
                onPress={createActionHandler(config)}
                testID={config.testID}
              />
            ),
        )}
      </Fragment>
    </SafeAreaView>
  );
};

export default MultichainAddWalletActions;
