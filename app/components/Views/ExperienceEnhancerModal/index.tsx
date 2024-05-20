import React, { useRef } from 'react';
import { View } from 'react-native';

import { strings } from '../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import createStyles from './styles';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { ButtonProps } from '../../../component-library/components/Buttons/Button/Button.types';
import { setDataCollectionForMarketing } from '../../../actions/security';

const ExperienceEnhancerModal = () => {
  const styles = createStyles();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const cancelButtonProps: ButtonProps = {
    variant: ButtonVariants.Secondary,
    label: strings('experience_enhancer_modal.cancel'),
    size: ButtonSize.Lg,
    onPress: () => {
      setDataCollectionForMarketing(false);
      bottomSheetRef.current?.onCloseBottomSheet();
    },
  };

  const acceptButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('experience_enhancer_modal.accept'),
    size: ButtonSize.Lg,
    onPress: () => {
      setDataCollectionForMarketing(true);
      bottomSheetRef.current?.onCloseBottomSheet();
    },
  };

  return (
    <BottomSheet ref={bottomSheetRef}>
      <Text variant={TextVariant.HeadingMD} style={styles.title}>
        {strings('experience_enhancer_modal.title')}
      </Text>
      <View style={styles.content}>
        <Text variant={TextVariant.BodyMD}>
          {strings('experience_enhancer_modal.paragraph1a')}
          <Button
            variant={ButtonVariants.Link}
            label={strings('experience_enhancer_modal.link')}
            // TODO: add link
            onPress={() => {}}
          />
          {strings('experience_enhancer_modal.paragraph1b')}
        </Text>

        <Text variant={TextVariant.BodyMD}>
          {strings('experience_enhancer_modal.paragraph2')}
        </Text>
        <View style={styles.list}>
          <Text style={styles.line}>
            <Text style={styles.dot}>•</Text>{' '}
            {strings('experience_enhancer_modal.bullet1')}
          </Text>
          <Text style={styles.line}>
            <Text style={styles.dot}>•</Text>{' '}
            {strings('experience_enhancer_modal.bullet2')}
          </Text>
          <Text style={styles.line}>
            <Text style={styles.dot}>•</Text>{' '}
            {strings('experience_enhancer_modal.bullet3')}
          </Text>
        </View>
        <Text variant={TextVariant.BodyMD}>
          {strings('experience_enhancer_modal.footer')}
        </Text>
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          buttonPropsArray={[cancelButtonProps, acceptButtonProps]}
        />
      </View>
    </BottomSheet>
  );
};

export default ExperienceEnhancerModal;
