import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
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
import {
  resetDappSpamState as resetDappSpamStateAction,
  resetSpamPrompt as resetSpamPromptAction,
} from '../../../core/redux/slices/dappSpamFilter';

export const BLOCK_BUTTON_TEST_ID = 'block-dapp-button';
export const CONTINUE_BUTTON_TEST_ID = 'continue-dapp-button';
export const GOT_IT_BUTTON_TEST_ID = 'got-it-button';

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
  handleCloseModal,
  handleResetDappSpamState,
  setBlockDapp,
}: {
  handleCloseModal: () => void;
  handleResetDappSpamState: () => void;
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
            handleResetDappSpamState();
            handleCloseModal();
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

const SiteBlockedContent = ({
  handleCloseModal,
}: {
  handleCloseModal: () => void;
}) => {
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
            handleCloseModal();
          }}
          size={ButtonSize.Lg}
          testID={GOT_IT_BUTTON_TEST_ID}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
        />
      </View>
    </>
  );
};

const DappSpamModal = ({
  resetDappSpamState,
  resetSpamPrompt,
  route,
}: {
  resetDappSpamState: (domain: string) => void;
  resetSpamPrompt: () => void;
  route: { params: { domain: string } };
}) => {
  const { domain } = route.params;
  const styles = createStyles();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isBlockDappOptedIn, setBlockDapp] = useState(false);

  const handleResetDappSpamState = () => {
    resetDappSpamState(domain);
  };

  const handleCloseModal = () => {
    resetSpamPrompt();
    sheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={sheetRef} isInteractable={false}>
      <View style={styles.wrapper}>
        {isBlockDappOptedIn ? (
          <SiteBlockedContent handleCloseModal={handleCloseModal} />
        ) : (
          <MultipleRequestContent
            handleCloseModal={handleCloseModal}
            handleResetDappSpamState={handleResetDappSpamState}
            setBlockDapp={setBlockDapp}
          />
        )}
      </View>
    </BottomSheet>
  );
};
const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  resetDappSpamState: (domain: string) =>
    dispatch(resetDappSpamStateAction(domain)),
  resetSpamPrompt: () => dispatch(resetSpamPromptAction()),
});

export default connect(mapStateToProps, mapDispatchToProps)(DappSpamModal);
