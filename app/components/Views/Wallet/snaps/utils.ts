export const TEST_SNAP_ID_ONE = 'local:http://localhost:3000/snap/';
export const TEST_SNAP_ID_TWO = 'local:http://localhost:3000/snapother/';

export const installTestSnap = async ({
  snapController,
  url,
}: {
  snapController: any;
  url: string;
}): Promise<void> => {
  const mockOrigin = 'origin';
  // eslint-disable-next-line no-console
  console.log('> Install snap', url);
  await snapController.installSnaps(mockOrigin, { [url]: {} });

  // eslint-disable-next-line no-console
  console.log('> Snap installed', url);
};

export const validateShasum = () => {
  // eslint-disable-next-line no-console
  console.log('validateShasum');
};
