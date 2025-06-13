import { KycStatus } from '../../hooks/useUserDetailsPolling';

interface UserDetails {
  kyc?: {
    l1?: {
      status?: string | null;
      type?: string | null;
    };
  };
}

const shouldNavigateToKycProcessing = (
  userDetails: UserDetails | null | undefined,
) => {
  const kycStatus = userDetails?.kyc?.l1?.status;
  const kycType = userDetails?.kyc?.l1?.type;

  return !!(
    kycStatus &&
    kycStatus !== KycStatus.NOT_SUBMITTED &&
    kycType !== null &&
    kycType !== 'SIMPLE'
  );
};

describe('KycWebview Logic', () => {
  it('should navigate to KYC processing when status is SUBMITTED and type is STANDARD', () => {
    const userDetails = {
      kyc: {
        l1: {
          status: KycStatus.SUBMITTED,
          type: 'STANDARD',
        },
      },
    };

    expect(shouldNavigateToKycProcessing(userDetails)).toBe(true);
  });

  it('should navigate to KYC processing when status is APPROVED and type is STANDARD', () => {
    const userDetails = {
      kyc: {
        l1: {
          status: KycStatus.APPROVED,
          type: 'STANDARD',
        },
      },
    };

    expect(shouldNavigateToKycProcessing(userDetails)).toBe(true);
  });

  it('should not navigate when KYC status is NOT_SUBMITTED', () => {
    const userDetails = {
      kyc: {
        l1: {
          status: KycStatus.NOT_SUBMITTED,
          type: 'STANDARD',
        },
      },
    };

    expect(shouldNavigateToKycProcessing(userDetails)).toBe(false);
  });

  it('should not navigate when KYC type is SIMPLE', () => {
    const userDetails = {
      kyc: {
        l1: {
          status: KycStatus.SUBMITTED,
          type: 'SIMPLE',
        },
      },
    };

    expect(shouldNavigateToKycProcessing(userDetails)).toBe(false);
  });

  it('should not navigate when KYC type is null', () => {
    const userDetails = {
      kyc: {
        l1: {
          status: KycStatus.SUBMITTED,
          type: null,
        },
      },
    };

    expect(shouldNavigateToKycProcessing(userDetails)).toBe(false);
  });

  it('should not navigate when KYC status is null', () => {
    const userDetails = {
      kyc: {
        l1: {
          status: null,
          type: 'STANDARD',
        },
      },
    };

    expect(shouldNavigateToKycProcessing(userDetails)).toBe(false);
  });

  it('should handle missing userDetails gracefully', () => {
    expect(shouldNavigateToKycProcessing(null)).toBe(false);
    expect(shouldNavigateToKycProcessing(undefined)).toBe(false);
    expect(shouldNavigateToKycProcessing({})).toBe(false);
  });

  it('should handle missing kyc data gracefully', () => {
    expect(shouldNavigateToKycProcessing({ kyc: undefined })).toBe(false);
    expect(shouldNavigateToKycProcessing({ kyc: {} })).toBe(false);
    expect(shouldNavigateToKycProcessing({ kyc: { l1: undefined } })).toBe(
      false,
    );
  });
});
