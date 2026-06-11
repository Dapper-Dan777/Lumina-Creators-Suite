/** Extract display URLs from OnlyFansAPI /me profile payload. */

export function pickCreatorImages(profile) {
  if (!profile || typeof profile !== 'object') {
    return { avatar: null, header: null };
  }

  const avatar =
    profile.avatarThumbs?.c144 ||
    profile.avatarThumbs?.c50 ||
    profile.avatar ||
    null;

  const header =
    profile.headerThumbs?.w760 ||
    profile.headerThumbs?.w480 ||
    profile.header ||
    null;

  return { avatar, header };
}