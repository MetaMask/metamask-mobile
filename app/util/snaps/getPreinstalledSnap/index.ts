export default function getPreinstalledSnap(
  npmPackage: string,
  manifest: string,
  files: { path: string; value: string }[],
) {
  return {
    snapId: `npm:${npmPackage}`,
    manifest: JSON.parse(manifest),
    files,
    removable: false,
  };
}
