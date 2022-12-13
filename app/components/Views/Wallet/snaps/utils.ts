export const installTestSnapFromLocalHost = async (snapController: any) => {
  // const snapId = 'npm:@metamask/test-snap-bip44';
  const localSnap = 'local:http://localhost:3000/snap/';
  const origin = 'origin';

  await snapController.installSnaps(origin, { [localSnap]: {} });
};

export const validateShasum = () => {
  // eslint-disable-next-line no-console
  console.log('validateShasum');
};
