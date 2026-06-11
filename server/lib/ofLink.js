import { listAccounts, getCurrentAccount } from '../adapters/onlyfans.js';
import { pickCreatorImages } from './ofProfile.js';

/** @param {string | null | undefined} handleOrUrl */
export function normalizeHandle(handleOrUrl) {
  if (!handleOrUrl) return '';
  const raw = String(handleOrUrl).trim().toLowerCase();
  const urlMatch = raw.match(/onlyfans\.com\/([^/?#]+)/);
  if (urlMatch) return urlMatch[1].replace(/^@/, '');
  return raw.replace(/^@/, '');
}

/** @param {import('@prisma/client').Creator} creator */
export function creatorMatchesAccount(creator, account) {
  if (creator.onlyfansAccountId && creator.onlyfansAccountId === account.id) return true;

  const ofUsername = normalizeHandle(account.onlyfans_username);
  if (!ofUsername) return false;

  const handle = normalizeHandle(creator.handle);
  const urlHandle = normalizeHandle(creator.onlyfansUrl);
  const stored = normalizeHandle(creator.onlyfansUsername);

  return handle === ofUsername || urlHandle === ofUsername || stored === ofUsername;
}

/** @param {import('@prisma/client').Creator[]} creators */
export function findCreatorForAccount(creators, account) {
  return creators.find((c) => creatorMatchesAccount(c, account)) ?? null;
}

async function profileDataForAccount(account) {
  try {
    const profile = await getCurrentAccount(account.id);
    const subs = Number(profile?.subscribersCount);
    const { avatar, header } = pickCreatorImages(profile);
    return {
      subscribers: Number.isFinite(subs) && subs >= 0 ? subs : null,
      avatar,
      header,
    };
  } catch {
    const cached = Number(account.onlyfans_user_data?.subscribersCount);
    return {
      subscribers: Number.isFinite(cached) && cached >= 0 ? cached : null,
      avatar: null,
      header: null,
    };
  }
}

/**
 * Match creators to OnlyFansAPI accounts by handle / URL / stored username.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {object[]} [prefetchedAccounts]
 */
export async function autoLinkCreators(prisma, prefetchedAccounts) {
  const accounts = prefetchedAccounts ?? (await listAccounts());
  const authenticated = accounts.filter((a) => a.is_authenticated);
  const creators = await prisma.creator.findMany();
  const linked = [];
  const unmatchedAccounts = [];

  for (const account of authenticated) {
    const username = normalizeHandle(account.onlyfans_username);
    const prof = await profileDataForAccount(account);
    const match = findCreatorForAccount(creators, account);

    if (match) {
      await prisma.creator.update({
        where: { id: match.id },
        data: {
          onlyfansAccountId: account.id,
          onlyfansUsername: username || match.onlyfansUsername,
          subscribers: prof.subscribers ?? match.subscribers,
          onlyfansUrl: match.onlyfansUrl || (username ? `https://onlyfans.com/${username}` : match.onlyfansUrl),
          ...(prof.avatar ? { avatar: prof.avatar, avatarSyncedAt: new Date() } : {}),
          ...(prof.header ? { headerUrl: prof.header } : {}),
        },
      });
      linked.push({
        creatorId: match.id,
        creatorName: match.name,
        accountId: account.id,
        username: username || account.onlyfans_username,
      });
    } else {
      unmatchedAccounts.push({
        accountId: account.id,
        username: username || account.onlyfans_username,
        hint: `Lege einen Creator mit Handle @${username} oder passender OnlyFans-URL an`,
      });
    }
  }

  return { linked, unmatchedAccounts, totalAccounts: authenticated.length };
}

/** @param {import('@prisma/client').PrismaClient} prisma */
export async function autoLinkSingleCreator(prisma, creator) {
  const accounts = (await listAccounts()).filter((a) => a.is_authenticated);
  const match = accounts.find((a) => creatorMatchesAccount(creator, a));
  if (!match) {
    const handle = normalizeHandle(creator.handle);
    const urlHandle = normalizeHandle(creator.onlyfansUrl);
    const byHandle = accounts.find((a) => {
      const u = normalizeHandle(a.onlyfans_username);
      return u && (u === handle || u === urlHandle);
    });
    if (!byHandle) return { linked: false, creator };
    return linkCreatorToAccount(prisma, creator, byHandle);
  }
  return linkCreatorToAccount(prisma, creator, match);
}

async function linkCreatorToAccount(prisma, creator, account) {
  const username = normalizeHandle(account.onlyfans_username);
  const prof = await profileDataForAccount(account);
  const row = await prisma.creator.update({
    where: { id: creator.id },
    data: {
      onlyfansAccountId: account.id,
      onlyfansUsername: username || creator.onlyfansUsername,
      subscribers: prof.subscribers ?? creator.subscribers,
      onlyfansUrl: creator.onlyfansUrl || (username ? `https://onlyfans.com/${username}` : creator.onlyfansUrl),
      ...(prof.avatar ? { avatar: prof.avatar, avatarSyncedAt: new Date() } : {}),
      ...(prof.header ? { headerUrl: prof.header } : {}),
    },
  });
  return {
    linked: true,
    creator: row,
    accountId: account.id,
    username: username || account.onlyfans_username,
  };
}