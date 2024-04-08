export default function getPreinstalledSnap(
  npmPackage: string,
  manifest: string,
  files: { path: string; value: string }[],
) {
  return {
    snapId: `npm:${npmPackage}`,
    manifest: JSON.parse(manifest),
    files: files.map((file) => ({
      path: file.path,
      value: file.value,
    })),
    removable: false,
  };
}
