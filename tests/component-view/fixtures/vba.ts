/** Pix deposit instructions shared by the VBA details unit and view tests. */
export const VBA_TEST_PIX_INSTRUCTIONS = {
  type: 'Pix' as const,
  brCode: '00020126',
  instruction: 'Pay with PIX',
  pixKey: 'pix@example.com',
};

/** US bank deposit instructions shared by the VBA details unit and view tests. */
export const VBA_TEST_US_BANK_INSTRUCTIONS = {
  type: 'UsBank' as const,
  rail: 'ACH',
  accountHolder: 'Jane Doe',
  routingNumber: '021000021',
  accountNumber: '123456789',
  bankName: 'Lead Bank',
};
