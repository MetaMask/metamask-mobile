import { ReactNode } from "react";
import { BannerAlertProps } from "../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types";

export type BlockaidBannerProps = BannerAlertProps & {
    attackType:
      | 'raw_signature_farming'
      | 'approval_farming'
      | 'set_approval_for_all_farming'
      | 'permit_farming'
      | 'transfer_farming'
      | 'transfer_from_farming'
      | 'raw_native_token_transfer'
      | 'seaport_farming'
      | 'blur_farming'
      | 'unfair_trade'
      | 'others'
  
      attackDetails: string | ReactNode;
      onToggleShowDetails?: () => void;
  };