/* Release facts in one place, so a version bump touches one file. */
export const VERSION = "1.2.1";
export const RELEASE_TAG = `v${VERSION}`;
export const INSTALLER = `Serion_${VERSION}_x64-setup.exe`;
export const INSTALLER_SIZE = "1.6 MB";
/* The same file in bytes, for the structured-data block. */
export const INSTALLER_BYTES = "1695683";

const REPO = "https://github.com/mahtamun-hoque-fahim/serion";

export const URLS = {
  repo: REPO,
  releases: `${REPO}/releases`,
  latest: `${REPO}/releases/latest`,
  download: `${REPO}/releases/download/${RELEASE_TAG}/${INSTALLER}`,
  changelog: `${REPO}/blob/main/CHANGELOG.md`,
  license: `${REPO}/blob/main/LICENSE`,
  credits: `${REPO}/blob/main/CREDITS.md`,
  issues: `${REPO}/issues`,
} as const;
