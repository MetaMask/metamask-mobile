// Only keep selectors that are actually used in tests
export const TestSnapViewSelectorWebIDS = {
  connectBip32Button: 'connectbip32',
  connectBip44Button: 'connectbip44',
  getPublicKeyBip44Button: 'sendBip44Test',
  signMessageBip44Button: 'signBip44Message',
  getPublicKeyBip32Button: 'bip32GetPublic',
  getCompressedPublicKeyBip32Button: 'bip32GetCompressedPublic',
  signMessageBip32Secp256k1Button: 'sendBip32-secp256k1',
  signMessageBip32ed25519Button: 'sendBip32-ed25519',
  signMessageBip32ed25519Bip32Button: 'sendBip32-ed25519Bip32',
};

export const TestSnapInputSelectorWebIDS = {
  messageBip44Input: 'bip44Message',
  messageEd25519Bip32Input: 'bip32Message-ed25519Bip32',
  messageEd25519Input: 'bip32Message-ed25519',
  messageSecp256k1Input: 'bip32Message-secp256k1',
};

export const EntropyDropDownSelectorWebIDS = {
  bip32EntropyDropDown: 'bip32-entropy-selector',
  bip44EntropyDropDown: 'bip44-entropy-selector',
};

export const TestSnapResultSelectorWebIDS = {
  bip44ResultSpan: 'bip44Result',
  bip44SignResultSpan: 'bip44SignResult',
  bip32MessageResultEd25519Span: 'bip32MessageResult-ed25519',
  bip32MessageResultSecp256k1Span: 'bip32MessageResult-secp256k1',
  bip32MessageResultEd25519Bip32Span: '#bip32MessageResult-ed25519Bip32',
  bip32PublicKeyResultSpan: 'bip32PublicKeyResult',
};

export const TestSnapBottomSheetSelectorWebIDS = {
  BOTTOMSHEET_FOOTER_BUTTON_ID: 'bottomsheetfooter-button-subsequent',
};
