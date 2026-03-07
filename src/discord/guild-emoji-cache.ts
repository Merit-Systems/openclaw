import { RequestClient } from "@buape/carbon";
import { Routes } from "discord-api-types/v10";

interface GuildEmoji {
  id: string;
  name: string;
}

interface CacheEntry {
  emojis: GuildEmoji[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const guildEmojiCache = new Map<string, CacheEntry>();

async function getGuildEmojis(rest: RequestClient, guildId: string): Promise<GuildEmoji[]> {
  const cached = guildEmojiCache.get(guildId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.emojis;
  }
  const raw = (await rest.get(Routes.guildEmojis(guildId))) as Array<{
    id?: string;
    name?: string;
  }>;
  const emojis = (raw ?? [])
    .filter((e): e is { id: string; name: string } => Boolean(e.id && e.name))
    .map((e) => ({ id: e.id, name: e.name }));
  guildEmojiCache.set(guildId, { emojis, fetchedAt: Date.now() });
  return emojis;
}

function isPlainEmojiName(raw: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(raw);
}

async function getGuildIdFromChannel(
  rest: RequestClient,
  channelId: string,
): Promise<string | null> {
  try {
    const channel = (await rest.get(Routes.channel(channelId))) as { guild_id?: string };
    return channel.guild_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve a plain emoji name to `name:id` format using guild emoji lookup.
 * Returns the original string unchanged for unicode emoji, name:id, or <:name:id> formats.
 */
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

  const emojis = await getGuildEmojis(rest, guildId);
  const match = emojis.find((e) => e.name === trimmed);
  if (!match) {
    return emoji;
  }

  return `${match.name}:${match.id}`;
}
