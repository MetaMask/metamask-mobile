import type { SnapId } from '@metamask/snaps-sdk';
export default function getPreinstalledSnap(
  npmPackage: string,
  manifest: string,
  files: { path: string; value: string }[],
) {
  return {
    snapId: `npm:${npmPackage}` as SnapId,
    manifest: JSON.parse(manifest),
    files: files.map((file) => ({
      path: file.path,
      value: file.value,
    })),
    removable: false,
  };
}
