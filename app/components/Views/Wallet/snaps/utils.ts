export const TEST_SNAP_ID_ONE = 'local:http://localhost:3000/snap/';
export const TEST_SNAP_ID_TWO = 'local:http://localhost:3000/snapother/';

export const installTestSnap = async ({
  snapController,
  snapId,
}: {
  snapController: any;
  snapId: string;
}): Promise<void> => {
  const mockOrigin = 'origin';
  await snapController.installSnaps(mockOrigin, { [snapId]: {} });
  await snapController.terminateSnap(snapId);
};

export const validateShasum = () => {
  // eslint-disable-next-line no-console
  console.log('validateShasum');
};
