import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import Button from '../../../component-library/components/Buttons/Button/Button';
import Icon, {
  IconSize,
  IconName,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Text from '../../../component-library/components/Texts/Text';
import { resetDappSpamState } from '../../../core/redux/slices/dappSpamFilter';

export const BLOCK_BUTTON_TEST_ID = 'block-dapp-button';
export const CONTINUE_BUTTON_TEST_ID = 'continue-dapp-button';

const createStyles = () =>
  StyleSheet.create({
    buttonsWrapper: {
      alignSelf: 'stretch',
      flexDirection: 'column',
      gap: 16,
      paddingTop: 24,
    },
    wrapper: {
      alignItems: 'center',
      padding: 16,
    },
  });

const MultipleRequestContent = ({
  onCloseModal,
  onResetDappSpamState,
  setBlockDapp,
}: {
  onCloseModal: () => void;
  onResetDappSpamState: () => void;
  setBlockDapp: (value: boolean) => void;
}) => {
  const styles = createStyles();
  return (
    <>
      <Icon
        color={IconColor.Warning}
        name={IconName.Danger}
        size={IconSize.Xl}
      />
      <SheetHeader title={strings('spam_filter.title')} />
      <Text>{strings('spam_filter.description')}</Text>
      <View style={styles.buttonsWrapper}>
        <Button
          label={strings('spam_filter.continue')}
          onPress={() => {
            onResetDappSpamState();
            onCloseModal();
          }}
          size={ButtonSize.Lg}
          testID={CONTINUE_BUTTON_TEST_ID}
          variant={ButtonVariants.Secondary}
          width={ButtonWidthTypes.Full}
        />
        <Button
          label={strings('spam_filter.block_dapp_requests_for_1_minute')}
          onPress={() => {
            setBlockDapp(true);
          }}
          size={ButtonSize.Lg}
          testID={BLOCK_BUTTON_TEST_ID}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
        />
      </View>
    </>
  );
};

const SiteBlockedContent = ({ onCloseModal }: { onCloseModal: () => void }) => {
  const styles = createStyles();
  return (
    <>
      <Icon
        color={IconColor.Success}
        name={IconName.Confirmation}
        size={IconSize.Xl}
      />
      <SheetHeader title={strings('spam_filter.title')} />
      <Text>{strings('spam_filter.site_blocked_description')}</Text>
      <View style={styles.buttonsWrapper}>
        <Button
          label={strings('spam_filter.got_it')}
          onPress={() => {
            onCloseModal();
          }}
          size={ButtonSize.Lg}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
        />
      </View>
    </>
  );
};

const DappSpamModal = ({
  route,
}: {
  route: { params: { domain: string } };
}) => {
  const dispatch = useDispatch();
  const { domain } = route.params;
  const styles = createStyles();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isBlockDappOptedIn, setBlockDapp] = useState(false);

  const onResetDappSpamState = () => {
    dispatch(resetDappSpamState(domain));
  };

  const onCloseModal = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={sheetRef} isInteractable={false}>
      <View style={styles.wrapper}>
        {isBlockDappOptedIn ? (
          <SiteBlockedContent onCloseModal={onCloseModal} />
        ) : (
          <MultipleRequestContent
            onCloseModal={onCloseModal}
            onResetDappSpamState={onResetDappSpamState}
            setBlockDapp={setBlockDapp}
          />
        )}
      </View>
    </BottomSheet>
  );
};

export default DappSpamModal;
