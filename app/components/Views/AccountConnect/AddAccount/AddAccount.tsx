import React from 'react';
import { Box } from '../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../UI/Box/box.types';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import { SafeAreaView, TouchableWithoutFeedback } from 'react-native';
import { useStyles } from '../../../hooks/useStyles';
import styleSheet from './AddAccount.styles';
import { WalletClientType } from '../../../../core/SnapKeyring/MultichainWalletSnapClient';
import { CaipChainId } from '@metamask/utils';
import {
  SolScope,
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  TrxScope,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-api';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';

interface AddAccountProps {
  onBack: () => void;
  onCreateAccount: (clientType?: WalletClientType, scope?: CaipChainId) => void;
}

const AddAccountSelection = ({ onBack, onCreateAccount }: AddAccountProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;

  return (
    <SafeAreaView>
      <SheetHeader
        title={strings('accounts.connect_accounts_title')}
        onBack={onBack}
      />
      <Box style={styles.container}>
        <Box
          flexDirection={FlexDirection.Column}
          justifyContent={JustifyContent.flexStart}
          alignItems={AlignItems.flexStart}
        >
          <Text style={styles.title}>
            {strings('accounts.create_new_account')}
          </Text>
          <TouchableWithoutFeedback
            onPress={() => {
              onCreateAccount();
            }}
          >
            <Box
              style={styles.linkContainer}
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              gap={10}
            >
              <Icon
                name={IconName.Add}
                size={IconSize.Md}
                color={colors.primary.default}
              />
              <Text
                variant={TextVariant.BodyMDMedium}
                color={colors.primary.default}
              >
                {strings('account_actions.add_new_account')}
              </Text>
            </Box>
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback
            onPress={() => {
              onCreateAccount(WalletClientType.Solana, SolScope.Mainnet);
            }}
          >
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              gap={10}
            >
              <Icon
                name={IconName.Add}
                size={IconSize.Md}
                color={colors.primary.default}
              />
              <Text
                variant={TextVariant.BodyMDMedium}
                color={colors.primary.default}
              >
                {strings('account_actions.add_solana_account')}
              </Text>
            </Box>
          </TouchableWithoutFeedback>
          {
            ///: BEGIN:ONLY_INCLUDE_IF(tron)
          }
          <TouchableWithoutFeedback
            onPress={() => {
              onCreateAccount(WalletClientType.Tron, TrxScope.Mainnet);
            }}
          >
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              gap={10}
            >
              <Icon
                name={IconName.Add}
                size={IconSize.Md}
                color={colors.primary.default}
              />
              <Text
                variant={TextVariant.BodyMDMedium}
                color={colors.primary.default}
              >
                {strings('account_actions.add_tron_account')}
              </Text>
            </Box>
          </TouchableWithoutFeedback>
          {
            ///: END:ONLY_INCLUDE_IF
          }
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default AddAccountSelection;
