import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { View } from 'react-native';
import { SolScope } from '@metamask/keyring-api';
import Text from '../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import Logger from '../../../util/Logger';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import FeatureItem from './FeatureItem';
import { useTheme } from '../../../util/theme';
import SolanaLogo from '../../../images/solana-logo-transparent.svg';
import { strings } from '../../../../locales/i18n';
import { selectHasCreatedSolanaMainnetAccount } from '../../../selectors/accountsController';
import createStyles from './SolanaNewFeatureContent.styles';
import StorageWrapper from '../../../store/storage-wrapper';
import { SOLANA_FEATURE_MODAL_SHOWN } from '../../../constants/storage';
import {
  MultichainWalletSnapFactory,
  WalletClientType,
} from '../../../core/SnapKeyring/MultichainWalletSnapClient';

const SolanaNewFeatureContent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sheetRef = useRef<BottomSheetRef>(null);

  const { colors } = useTheme();
  const styles = createStyles(colors);
  const hasExistingSolanaAccount = useSelector(
    selectHasCreatedSolanaMainnetAccount,
  );

  useEffect(() => {
    const checkModalStatus = async () => {
      const hasSeenModal = await StorageWrapper.getItem(
        SOLANA_FEATURE_MODAL_SHOWN,
      );
      setIsVisible(hasSeenModal !== 'true');
    };
    checkModalStatus();
  }, []);

  /**
   * Sheet close functionality (does not fire ref close to prevent infinite recursion)
   */
  const handleSheetClose = async () => {
    await StorageWrapper.setItem(SOLANA_FEATURE_MODAL_SHOWN, 'true');
    setIsVisible(false);
  };

  /**
   * Close Button, invokes both sheet closing and ref closing
   */
  const handleClose = async () => {
    await handleSheetClose();
    sheetRef.current?.onCloseBottomSheet();
  };

  const createSolanaAccount = async () => {
    try {
      const client = MultichainWalletSnapFactory.createClient(
        WalletClientType.Solana,
      );

      await client.createAccount({
        scope: SolScope.Mainnet,
      });
    } catch (error) {
      Logger.error(error as Error, 'Solana account creation failed');
    } finally {
      handleClose();
    }
  };

  const features = [
    {
      title: strings('solana_new_feature_content.feature_1_title'),
      description: strings('solana_new_feature_content.feature_1_description'),
    },
    {
      title: strings('solana_new_feature_content.feature_2_title'),
      description: strings('solana_new_feature_content.feature_2_description'),
    },
    {
      title: strings('solana_new_feature_content.feature_3_title'),
      description: strings('solana_new_feature_content.feature_3_description'),
    },
  ];

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={handleSheetClose}
      shouldNavigateBack={false}
    >
      <View style={styles.wrapper}>
        <SolanaLogo name="solana-logo" height={65} />
        <Text style={styles.title}>
          {strings('solana_new_feature_content.title')}
        </Text>

        <View style={styles.featureList}>
          {features.map((feature, index) => (
            <FeatureItem
              key={index}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </View>

        <Button
          variant={ButtonVariants.Primary}
          label={strings(
            hasExistingSolanaAccount
              ? 'solana_new_feature_content.got_it'
              : 'solana_new_feature_content.create_solana_account',
          )}
          onPress={hasExistingSolanaAccount ? handleClose : createSolanaAccount}
          width={ButtonWidthTypes.Full}
        />

        <Button
          variant={ButtonVariants.Link}
          label={strings('solana_new_feature_content.not_now')}
          onPress={handleClose}
          style={styles.cancelButton}
        />
      </View>
    </BottomSheet>
  );
};

export default SolanaNewFeatureContent;
