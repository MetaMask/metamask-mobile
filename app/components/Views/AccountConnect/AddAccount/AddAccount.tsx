import React from 'react';
import { Box } from '../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../UI/Box/box.types';
import ButtonLink from '../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import Text from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import { SafeAreaView } from 'react-native';
import { useStyles } from '../../../hooks/useStyles';
import styleSheet from './AddAccount.styles';
import { WalletClientType } from '../../../../core/SnapKeyring/MultichainWalletSnapClient';
import { CaipChainId } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';

interface AddAccountProps {
  onBack: () => void;
  onCreateAccount: (clientType?: WalletClientType, scope?: CaipChainId) => void;
}

const AddAccountSelection = ({ onBack, onCreateAccount }: AddAccountProps) => {
  const { styles } = useStyles(styleSheet, {});

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
          <ButtonLink
            label={
              <Box
                flexDirection={FlexDirection.Row}
                alignItems={AlignItems.center}
              >
                <Icon name={IconName.Add} size={IconSize.Md} />
                <Text>{strings('account_actions.add_new_account')}</Text>
              </Box>
            }
            onPress={() => {
              onCreateAccount();
            }}
          />
          <ButtonLink
            label={
              <Box
                flexDirection={FlexDirection.Row}
                alignItems={AlignItems.center}
              >
                <Icon name={IconName.Add} size={IconSize.Md} />
                <Text>{strings('account_actions.add_solana_account')}</Text>
              </Box>
            }
            onPress={() => {
              onCreateAccount(WalletClientType.Solana, SolScope.Mainnet);
            }}
          />
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default AddAccountSelection;
