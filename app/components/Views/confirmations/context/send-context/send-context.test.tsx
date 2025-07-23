import { useSendContext } from './send-context';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatch: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// describe('QRHardwareContext', () => {
//   const createCameraSpy = (mockedValues: {
//     cameraError: string | undefined;
//     hasCameraPermission: boolean;
//   }) => {
//     jest.spyOn(Camera, 'useCamera').mockReturnValue(mockedValues);
//   };

//   const createQRHardwareAwarenessSpy = (mockedValues: {
//     isQRSigningInProgress: boolean;
//     isSigningQRObject: boolean;
//     QRState: IQRState;
//   }) => {
//     jest
//       .spyOn(QRHardwareAwareness, 'useQRHardwareAwareness')
//       .mockReturnValue(mockedValues);
//   };

//   it('should pass correct value of needsCameraPermission to child components', () => {
//     createCameraSpy({ cameraError: undefined, hasCameraPermission: false });
//     createQRHardwareAwarenessSpy({
//       isQRSigningInProgress: true,
//       isSigningQRObject: true,
//       QRState: mockQRState,
//     });
//     const { getByTestId } = renderWithProvider(
//       <QRHardwareContextProvider>
//         <Footer />
//       </QRHardwareContextProvider>,
//       {
//         state: personalSignatureConfirmationState,
//       },
//     );
//     expect(
//       getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON).props.disabled,
//     ).toBe(true);
//   });

//   it('does not invokes KeyringController.cancelQRSignRequest when request is cancelled id QR signing is not in progress', async () => {
//     createCameraSpy({ cameraError: undefined, hasCameraPermission: false });
//     createQRHardwareAwarenessSpy({
//       isQRSigningInProgress: false,
//       isSigningQRObject: true,
//       QRState: mockQRState,
//     });
//     const { getByText } = renderWithProvider(
//       <QRHardwareContextProvider>
//         <Footer />
//       </QRHardwareContextProvider>,
//       {
//         state: personalSignatureConfirmationState,
//       },
//     );
//     await userEvent.press(getByText('Cancel'));
//     expect(
//       Engine.context.KeyringController.cancelQRSignRequest,
//     ).toHaveBeenCalledTimes(0);
//   });

//   it('invokes KeyringController.cancelQRSignRequest when request is cancelled', async () => {
//     createCameraSpy({ cameraError: undefined, hasCameraPermission: false });
//     createQRHardwareAwarenessSpy({
//       isQRSigningInProgress: true,
//       isSigningQRObject: true,
//       QRState: mockQRState,
//     });
//     const { getByText } = renderWithProvider(
//       <QRHardwareContextProvider>
//         <Footer />
//       </QRHardwareContextProvider>,
//       {
//         state: personalSignatureConfirmationState,
//       },
//     );
//     await userEvent.press(getByText('Cancel'));
//     expect(
//       Engine.context.KeyringController.cancelQRSignRequest,
//     ).toHaveBeenCalledTimes(1);
//   });

//   it('passes correct value of QRState components', () => {
//     createCameraSpy({ cameraError: undefined, hasCameraPermission: false });
//     createQRHardwareAwarenessSpy({
//       isQRSigningInProgress: true,
//       isSigningQRObject: true,
//       QRState: mockQRState,
//     });
//     const { getByText } = renderWithProvider(
//       <QRHardwareContextProvider>
//         <QRInfo />
//       </QRHardwareContextProvider>,
//       {
//         state: personalSignatureConfirmationState,
//       },
//     );
//     expect(getByText('Scan with your hardware wallet')).toBeTruthy();
//   });

//   it('passes correct value of scannerVisible to child components', async () => {
//     createCameraSpy({ cameraError: undefined, hasCameraPermission: true });
//     createQRHardwareAwarenessSpy({
//       isQRSigningInProgress: true,
//       isSigningQRObject: true,
//       QRState: mockQRState,
//     });
//     const { getByText } = renderWithProvider(
//       <QRHardwareContextProvider>
//         <>
//           <Footer />
//           <QRInfo />
//         </>
//       </QRHardwareContextProvider>,
//       {
//         state: personalSignatureConfirmationState,
//       },
//     );
//     await userEvent.press(getByText('Get Signature'));
//     expect(
//       getByText('Scan your hardware wallet to confirm the transaction'),
//     ).toBeTruthy();
//   });

//   it('navigate back when cancel is clicked', async () => {
//     const { getByText } = renderComponent();

//     fireEvent.press(getByText('Cancel'));
//     expect(mockGoBack).toHaveBeenCalledTimes(1);
//   });

//   it('when confirm is clicked create transaction', async () => {
//     const { getByText } = renderComponent();

//     // actual implementation to come here when confirm is implemented
//     fireEvent.press(getByText('Confirm'));
//     expect(mockGoBack).toHaveBeenCalledTimes(1);
//   });

//   it('asset passed in nav params should be used if present', async () => {
//     (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
//       params: {
//         asset: {
//           name: 'Ethereum',
//         },
//       },
//     } as RouteProp<ParamListBase, string>);
//     const { getByText } = renderComponent();
//     expect(getByText('Asset: Ethereum')).toBeTruthy();
//   });
// });

describe('useSendContext', () => {
  it('should throw error is not wrapped in SendContext', () => {
    expect(() => {
      useSendContext();
    }).toThrow();
  });
});
