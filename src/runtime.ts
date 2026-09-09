// Knip's runtime requirement is stricter than the framework scaffolders'.
export const NODE_ENGINE = "^20.19.0 || >=22.12.0";

export function assertNodeVersion(version = process.versions.node) {
  const parts = version.match(/^(\d+)\.(\d+)\.(\d+)$/u);
  const major = Number(parts?.[1]);
  const minor = Number(parts?.[2]);
  if (
    parts &&
    ((major === 20 && minor >= 19) ||
      (major === 22 && minor >= 12) ||
      major > 22)
  )
    return;
  throw new Error(
    `Node.js ${version} is not supported. Use Node.js 20.19+ (20.x), or 22.12+. Upgrade Node.js and run the installer again.`,
  );
}
