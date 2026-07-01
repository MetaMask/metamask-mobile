import React, { useCallback, useRef } from 'react';
import { Image, type ImageSourcePropType, ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { SectionHeader, OptionRow } from './OnboardingFundWallet.components';
import googlePayImage from '../../../images/google_pay.png';
import venmoImage from '../../../images/venom_pay.png';
import upiImage from '../../../images/upi_pay.png';
import pixImage from '../../../images/pix_pay.png';
import idealImage from '../../../images/ideal_pay.png';
import revolutPayImage from '../../../images/revolut_pay.png';

interface MoreWaysToFundBottomSheetProps {
  onClose: () => void;
  onSelect: (id: string) => void;
}

interface MoreWaysEntry {
  id: string;
  label: string;
  description: string;
  image?: ImageSourcePropType;
  section: 'digital_wallets' | 'regional';
}

const ENTRIES: MoreWaysEntry[] = [
  {
    id: 'revolut_pay',
    label: 'Revolut Pay',
    description: 'Instant • $10,000 limit',
    image: revolutPayImage as ImageSourcePropType,
    section: 'digital_wallets',
  },
  {
    id: 'google_pay',
    label: 'Google Pay',
    description: 'Instant • $10,000 limit',
    image: googlePayImage,
    section: 'digital_wallets',
  },
  {
    id: 'venmo',
    label: 'Venmo',
    description: 'Instant • $10,000 limit',
    section: 'digital_wallets',
    image: venmoImage,
  },
  {
    id: 'upi',
    label: 'UPI',
    description: 'Instant • $10,000 limit',
    image: upiImage,
    section: 'regional',
  },
  {
    id: 'pix',
    label: 'PIX',
    description: 'Instant • $10,000 limit',
    image: pixImage,
    section: 'regional',
  },
  {
    id: 'ideal',
    label: 'iDEAL',
    description: 'Instant • $10,000 limit',
    image: idealImage,
    section: 'regional',
  },
];

const digitalWallets = ENTRIES.filter((e) => e.section === 'digital_wallets');
const regional = ENTRIES.filter((e) => e.section === 'regional');

const EntryIcon = ({ entry }: { entry: MoreWaysEntry }) => {
  const tw = useTailwind();

  if (entry.image) {
    return (
      <Image
        source={entry.image}
        style={tw.style('h-5 w-5')}
        resizeMode="contain"
      />
    );
  }

  return (
    <Icon
      name={IconName.Card}
      size={IconSize.Md}
      color={IconColor.IconAlternative}
    />
  );
};

const MoreWaysToFundBottomSheet = ({
  onClose,
  onSelect,
}: MoreWaysToFundBottomSheetProps) => {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose]);

  return (
    <BottomSheet ref={bottomSheetRef} onClose={onClose} isInteractable>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {strings('onboarding_fund_wallet.more_ways_sheet_title')}
        </Text>
      </BottomSheetHeader>

      <ScrollView
        contentContainerStyle={tw.style('px-4 pb-6')}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          title={strings(
            'onboarding_fund_wallet.more_ways_section_digital_wallets',
          )}
        />
        {digitalWallets.map((entry) => (
          <OptionRow
            key={entry.id}
            testID={`more-ways-option-${entry.id}`}
            label={entry.label}
            description={entry.description}
            onPress={() => onSelect(entry.id)}
            icon={<EntryIcon entry={entry} />}
          />
        ))}

        <Box twClassName="mt-2 border-t border-border-muted pt-4">
          <SectionHeader
            title={strings('onboarding_fund_wallet.more_ways_section_regional')}
          />
          {regional.map((entry) => (
            <OptionRow
              key={entry.id}
              testID={`more-ways-option-${entry.id}`}
              label={entry.label}
              description={entry.description}
              onPress={() => onSelect(entry.id)}
              icon={<EntryIcon entry={entry} />}
            />
          ))}
        </Box>
      </ScrollView>
    </BottomSheet>
  );
};

export default MoreWaysToFundBottomSheet;
