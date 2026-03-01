import { OpenAI } from "openai";
import { AppEnv } from "./env.js";
import { Story } from "./types.js";

interface GroupedStory {
  summary: string;
  sourceUrls: string[];
}

export class ContentEngine {
  private openai: OpenAI;

  constructor(env: AppEnv) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required for content synthesis");
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async synthesizeStories(stories: Story[]): Promise<GroupedStory[]> {
    if (stories.length === 0) return [];

    const prompt = `
You are a content editor for a Twitter account covering GameStop (GME) and Ryan Cohen.
Your goal is to group related news/tweets and write ONE combined summary for each group.

INPUT STORIES:
${stories.map((s, i) => `[${i + 1}] Source: ${s.source} | Text: "${s.text.replace(/\n/g, ' ')}" | URL: ${s.url}`).join("\n")}

INSTRUCTIONS:
1. Group stories that cover the same specific event or topic.
2. If a story is unique/unrelated to others, keep it as its own group.
3. Write a short, punchy summary for each group (max 240 chars).
   - Tone: Casual, factual, no hype words (revolutionary, game-changer, moass), plain English.
   - Do NOT use @mentions or hashtags in the summary text.
   - Start with "Sources say..." or "[Author] notes..." if relevant.
4. Return JSON format:
   {
     "groups": [
       { "summary": "string", "ids": [1, 3] }
     ]
   }
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) return [];

      const parsed = JSON.parse(content) as { groups: { summary: string; ids: number[] }[] };

      return parsed.groups.map(group => {
        // Map the 1-based IDs back to urls
        const urls = group.ids.map(id => stories[id - 1]?.url).filter(Boolean);
        // Append the first URL to the summary for context (Twitter card)
        const mainUrl = urls[0];
        const finalSummary = `${group.summary} ${mainUrl}`;
        
        return {
          summary: finalSummary,
          sourceUrls: urls
        };
      });

    } catch (err) {
      console.error("Content synthesis failed:", err);
      // Fallback: return 1:1 mapping if LLM fails
      return stories.map(s => ({
        summary: `${s.source} says ${s.text.slice(0, 100)}... ${s.url}`,
        sourceUrls: [s.url]
      }));
    }
  }
}
