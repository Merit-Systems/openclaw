import { getChannel, listGuildEmojis, type RequestClient } from "./internal/discord.js";

interface GuildEmoji {
  id: string;
  name: string;
}

interface CacheEntry {
  emojis: GuildEmoji[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

const guildEmojiCache = new Map<string, CacheEntry>();

function isPlainEmojiName(raw: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(raw);
}

async function getGuildIdFromChannel(
  rest: RequestClient,
  channelId: string,
): Promise<string | undefined> {
  try {
    const channel = (await getChannel(rest, channelId)) as { guild_id?: string };
    return channel.guild_id;
  } catch {
    return undefined;
  }
}

async function getGuildEmojiList(rest: RequestClient, guildId: string): Promise<GuildEmoji[]> {
  const cached = guildEmojiCache.get(guildId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.emojis;
  }

  const raw = (await listGuildEmojis(rest, guildId)) as Array<{
    id?: string;
    name?: string;
  }>;
  const emojis = (raw ?? [])
    .filter((emoji): emoji is { id: string; name: string } => Boolean(emoji.id && emoji.name))
    .map((emoji) => ({ id: emoji.id, name: emoji.name }));
  guildEmojiCache.set(guildId, { emojis, fetchedAt: Date.now() });
  return emojis;
}

export async function resolveGuildEmoji(
  rest: RequestClient,
  channelId: string,
  emoji: string,
): Promise<string> {
  const trimmed = emoji.trim();
  if (!isPlainEmojiName(trimmed)) {
    return emoji;
  }

  const guildId = await getGuildIdFromChannel(rest, channelId);
  if (!guildId) {
    return emoji;
  }

  const emojis = await getGuildEmojiList(rest, guildId);
  const match = emojis.find((entry) => entry.name === trimmed);
  return match ? `${match.name}:${match.id}` : emoji;
}
