/** Posting plan templates per niche — creates scheduled ContentItems. */

export const CONTENT_TEMPLATES = {
  'Fashion & Lifestyle': [
    { title: 'Monday Mood — OOTD', type: 'Post', dayOffset: 1, caption: 'New week, new looks ✨' },
    { title: 'Midweek Teaser', type: 'Story', dayOffset: 3, caption: 'Something special coming…' },
    { title: 'PPV — Exclusive Set', type: 'PPV', dayOffset: 5, price: 25, caption: 'Exclusive just for you 💕' },
    { title: 'Weekend Feed Drop', type: 'Post', dayOffset: 6, caption: 'Weekend vibes' },
  ],
  Fitness: [
    { title: 'Workout Wednesday', type: 'Post', dayOffset: 2, caption: 'Leg day done 💪' },
    { title: 'PPV — Gym Progress', type: 'PPV', dayOffset: 4, price: 20, caption: 'Full progress bundle' },
    { title: 'Meal Prep Story', type: 'Story', dayOffset: 5, caption: 'What I eat in a day' },
    { title: 'Sunday Stretch', type: 'Post', dayOffset: 7, caption: 'Recovery day' },
  ],
  Cosplay: [
    { title: 'Character Reveal Teaser', type: 'Story', dayOffset: 1, caption: 'Guess who…' },
    { title: 'PPV — Full Cosplay Set', type: 'PPV', dayOffset: 3, price: 35, caption: 'Complete shoot 🔥' },
    { title: 'BTS Post', type: 'Post', dayOffset: 5, caption: 'Behind the scenes' },
    { title: 'Fan Poll Story', type: 'Story', dayOffset: 6, caption: 'Next character vote' },
  ],
  Gaming: [
    { title: 'Stream Highlight', type: 'Post', dayOffset: 2, caption: 'Best moments from stream' },
    { title: 'PPV — Exclusive Gaming Set', type: 'PPV', dayOffset: 4, price: 15, caption: 'Gamer girl exclusive' },
    { title: 'Setup Tour Story', type: 'Story', dayOffset: 6, caption: 'My battlestation' },
  ],
  Glamour: [
    { title: 'Golden Hour Feed', type: 'Post', dayOffset: 1, caption: 'Golden hour magic' },
    { title: 'PPV — Lingerie Drop', type: 'PPV', dayOffset: 3, price: 30, caption: 'New lingerie collection' },
    { title: 'Teaser Story', type: 'Story', dayOffset: 4, caption: 'Tonight…' },
    { title: 'Weekend PPV Bundle', type: 'PPV', dayOffset: 6, price: 45, caption: 'Weekend bundle deal' },
  ],
  'Alt / Gothic': [
    { title: 'Dark Aesthetic Post', type: 'Post', dayOffset: 2, caption: 'Moody Monday' },
    { title: 'PPV — Gothic Set', type: 'PPV', dayOffset: 4, price: 28, caption: 'Dark exclusive' },
    { title: 'Playlist Story', type: 'Story', dayOffset: 5, caption: 'What I listen to' },
  ],
};

export function buildTemplateItems(niche, creatorId, startDate = new Date()) {
  const plan = CONTENT_TEMPLATES[niche] ?? CONTENT_TEMPLATES['Fashion & Lifestyle'];
  const base = new Date(startDate);
  base.setHours(12, 0, 0, 0);

  return plan.map((item, i) => {
    const scheduled = new Date(base);
    scheduled.setDate(base.getDate() + (item.dayOffset ?? i + 1));
    return {
      creatorId,
      title: item.title,
      caption: item.caption ?? '',
      type: item.type,
      status: 'scheduled',
      scheduledFor: scheduled.toISOString(),
      price: item.price ?? null,
      cover: 'linear-gradient(135deg,#ff2d8a,#00f0ff)',
    };
  });
}