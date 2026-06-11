/** Build OnlyFans profile URL from handle or explicit URL (assisted workflows only). */
export function onlyFansProfileUrl(handle?: string, onlyfansUrl?: string | null) {
  if (onlyfansUrl?.trim()) return onlyfansUrl.trim();
  if (!handle?.trim()) return "https://onlyfans.com/";
  const user = handle.replace(/^@/, "");
  return `https://onlyfans.com/${user}`;
}