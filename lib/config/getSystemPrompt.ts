import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const PAGE_ID = process.env.NOTION_SYSTEM_PROMPT_PAGE_ID!;

let cache: { prompt: string; fetchedAt: number } | null = null;
const TTL_MS = 60 * 60 * 1000; // 1 heure

const DEFAULT_PROMPT = "Tu es un expert CPF, RS et RNCP. Réponds de façon structurée et précise en français."

export async function getSystemPrompt(): Promise<string> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return cache.prompt;
  }

  if (!PAGE_ID) return DEFAULT_PROMPT;

  try {
    const blocks = await notion.blocks.children.list({
      block_id: PAGE_ID,
      page_size: 100,
    });

    const prompt = blocks.results
      .map((block: any) => {
        const type = block.type;
        const rich = block[type]?.rich_text ?? [];
        return rich.map((r: any) => r.plain_text).join("");
      })
      .filter((line: string) => line.trim() !== "")
      .join("\n");

    const result = prompt || DEFAULT_PROMPT;
    cache = { prompt: result, fetchedAt: Date.now() };
    return result;
  } catch (e: any) {
    console.warn("[getSystemPrompt] page inaccessible:", e?.message);
    return DEFAULT_PROMPT;
  }
}