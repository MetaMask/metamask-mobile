import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  AvatarIcon,
  AvatarIconSeverity,
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonSize,
  FontWeight,
  IconName,
  ListItem,
  ListItemVariant,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { strings } from '../../../../locales/i18n';

const TITLE_PROPS = {
  fontWeight: FontWeight.Bold,
};

const DESCRIPTION_PROPS = {
  variant: TextVariant.BodyMd,
  color: TextColor.TextDefault,
  fontWeight: FontWeight.Regular,
};

const SeedphraseModal = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet ref={bottomSheetRef} goBack={navigation.goBack}>
      <BottomSheetHeader onClose={handleClose}>
        {strings('account_backup_step_1.what_is_seedphrase_title')}
      </BottomSheetHeader>
      <Box twClassName="px-4 pb-2">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('account_backup_step_1.what_is_seedphrase_description')}
        </Text>
      </Box>
      <ListItem
        variant={ListItemVariant.MultiLine}
        avatar={
          <AvatarIcon
            iconName={IconName.Danger}
            severity={AvatarIconSeverity.Danger}
          />
        }
        title={strings('account_backup_step_1.keep_private_title')}
        titleProps={TITLE_PROPS}
        description={strings('account_backup_step_1.keep_private_description')}
        descriptionProps={DESCRIPTION_PROPS}
      />
      <Box twClassName="px-4">
        <SectionDivider marginVertical={0} />
      </Box>
      <ListItem
        variant={ListItemVariant.MultiLine}
        avatar={
          <AvatarIcon
            iconName={IconName.Lock}
            severity={AvatarIconSeverity.Neutral}
          />
        }
        title={strings('account_backup_step_1.store_safely_title')}
        titleProps={TITLE_PROPS}
        description={strings('account_backup_step_1.store_safely_description')}
        descriptionProps={DESCRIPTION_PROPS}
      />
      <BottomSheetFooter
        twClassName="pt-4"
        primaryButtonProps={{
          children: strings('account_backup_step_1.what_is_seedphrase_confirm'),
          onPress: handleClose,
          size: ButtonSize.Lg,
        }}
      />
    </BottomSheet>
  );
};

export default SeedphraseModal;
