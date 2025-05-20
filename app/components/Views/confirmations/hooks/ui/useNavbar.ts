import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useEffect } from 'react';
import { useTheme } from '../../../../../util/theme';
import { StakeNavigationParamsList } from '../../../../UI/Stake/types';
import { getNavbar } from '../../components/UI/navbar/navbar';
import { MMM_ORIGIN } from '../../constants/confirmations';
import { useTransactionBatchesMetadataRequest } from '../transactions/useTransactionBatchesMetadataRequest';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useConfirmActions } from '../useConfirmActions';

const useNavbar = (title: string, addBackButton = true) => {
  const navigation =
    useNavigation<StackNavigationProp<StakeNavigationParamsList>>();
  const { onReject } = useConfirmActions();
  const theme = useTheme();
  const transactionMetadata = useTransactionMetadataRequest();
  const transactionBatchesMetadata = useTransactionBatchesMetadataRequest();

  const isWalletInitiatedConfirmation = transactionMetadata?.origin === MMM_ORIGIN ||
    transactionBatchesMetadata?.origin === MMM_ORIGIN;

  useEffect(() => {
    if (isWalletInitiatedConfirmation) {
      navigation.setOptions(
        getNavbar({
          title,
          onReject,
          addBackButton,
          theme,
        }),
      );
    }
  }, [addBackButton, isWalletInitiatedConfirmation, navigation, onReject, theme, title]);
};

export default useNavbar;
