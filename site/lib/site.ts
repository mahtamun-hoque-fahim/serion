/* Release facts come from the latest GitHub Release: scripts/release.mjs
   rewrites release.json before every build, and publishing a release
   triggers a rebuild (.github/workflows/site-rebuild.yml). */
import release from "./release.json";

export const VERSION = release.version;
export const RELEASE_TAG = `v${VERSION}`;
/* Every release also carries the installer under this fixed name (the
   release workflow copies it), so the download link never names a version. */
export const INSTALLER = "Serion_x64-setup.exe";
export const INSTALLER_SIZE = `${(release.bytes / 1048576).toFixed(1)} MB`;
/* The same file in bytes, for the structured-data block. */
export const INSTALLER_BYTES = String(release.bytes);

const REPO = "https://github.com/mahtamun-hoque-fahim/serion";

export const URLS = {
  repo: REPO,
  releases: `${REPO}/releases`,
  latest: `${REPO}/releases/latest`,
  download: `${REPO}/releases/latest/download/${INSTALLER}`,
  changelog: `${REPO}/blob/main/CHANGELOG.md`,
  license: `${REPO}/blob/main/LICENSE`,
  credits: `${REPO}/blob/main/CREDITS.md`,
  issues: `${REPO}/issues`,
} as const;
