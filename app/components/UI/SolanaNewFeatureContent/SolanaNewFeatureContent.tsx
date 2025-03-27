import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { View, Text } from 'react-native';
import Modal from 'react-native-modal';
import { ButtonVariants, ButtonWidthTypes } from '../../../component-library/components/Buttons/Button';
import Button from '../../../component-library/components/Buttons/Button';
import FeatureItem from './FeatureItem';
import { useTheme } from '../../../util/theme';
import SolanaLogo from '../../../images/solana-logo-transparent.svg';
import { strings } from '../../../../locales/i18n';
import { selectHasCreatedSolanaMainnetAccount } from '../../../selectors/accountsController';
import createStyles from './SolanaNewFeatureContent.styles';
import StorageWrapper from '../../../store/storage-wrapper';
import { SOLANA_FEATURE_MODAL_SHOWN } from '../../../constants/storage';

const SolanaNewFeatureContent = () => {
  const [isVisible, setIsVisible] = useState(false);

  const { colors } = useTheme();
  const styles = createStyles(colors);
  const hasExistingSolanaAccount = useSelector(selectHasCreatedSolanaMainnetAccount);

  useEffect(() => {
    const checkModalStatus = async () => {
      // await StorageWrapper.removeItem(SOLANA_FEATURE_MODAL_SHOWN);
      const hasSeenModal = await StorageWrapper.getItem(SOLANA_FEATURE_MODAL_SHOWN);
      setIsVisible(hasSeenModal !== 'true');
    };
    checkModalStatus();
  }, []);

  const handleClose = async () => {
    await StorageWrapper.setItem(SOLANA_FEATURE_MODAL_SHOWN, 'true');
    setIsVisible(false);
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
    <Modal
    isVisible={isVisible}
    onBackdropPress={handleClose}
    onBackButtonPress={handleClose}
    onSwipeComplete={handleClose}
    swipeDirection={'down'}
    animationIn="slideInUp"
    animationOut="slideOutDown"
    propagateSwipe
    backdropColor={colors.overlay.default}
    backdropOpacity={1}
    style={styles.modal}
  >
    <View style={styles.wrapper}>
      <SolanaLogo name="solana-logo" height={65} />
      <Text style={styles.title}>{strings('solana_new_feature_content.title')}</Text>
      
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
            : 'solana_new_feature_content.create_solana_account'
        )}
        onPress={handleClose}
        width={ButtonWidthTypes.Full}
      />

      <Button
        variant={ButtonVariants.Link}
        label={strings('solana_new_feature_content.not_now')}
        onPress={handleClose}
        style={styles.cancelButton}
      />
    </View>

    </Modal>
  );
};

export default SolanaNewFeatureContent;