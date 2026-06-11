/** Map Prisma rows to frontend-friendly JSON (matches Zustand types). */

export function toApiCreator(row) {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    avatar: row.avatar,
    headerUrl: row.headerUrl ?? undefined,
    avatarSyncedAt: row.avatarSyncedAt?.toISOString?.() ?? undefined,
    niche: row.niche,
    status: row.status,
    revenueShare: row.revenueShare,
    monthlyRevenue: row.monthlyRevenue,
    monthlyGoal: row.monthlyGoal,
    subscribers: row.subscribers,
    growth: row.growth,
    team: Array.isArray(row.team) ? row.team : [],
    joinedAt: row.joinedAt,
    contractEndsAt: row.contractEndsAt,
    notes: row.notes,
    trend: Array.isArray(row.trend) ? row.trend : [],
    onlyfansUrl: row.onlyfansUrl ?? undefined,
    onlyfansAccountId: row.onlyfansAccountId ?? undefined,
    onlyfansUsername: row.onlyfansUsername ?? undefined,
  };
}

export function toApiContent(row) {
  return {
    id: row.id,
    creatorId: row.creatorId,
    title: row.title,
    caption: row.caption ?? '',
    type: row.type,
    status: row.status,
    scheduledFor: row.scheduledFor.toISOString(),
    price: row.price ?? undefined,
    cover: row.cover,
    publishedAt: row.publishedAt?.toISOString(),
  };
}