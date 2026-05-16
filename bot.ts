import { Bot } from "grammy";
import { generateText, stepCountIs, tool, type ModelMessage } from "ai";
import { Laminar, getTracer } from "@lmnr-ai/lmnr";
import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";

Laminar.initialize({ projectApiKey: process.env.LMNR_PROJECT_API_KEY });

const MEMORY_FILE = "./memory.md";

const memory_tools = {
  read_memory: tool({
    description: "Read the contents of the persistent memory file.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        return await readFile(MEMORY_FILE, "utf8");
      } catch {
        return "";
      }
    },
  }),
  write_memory: tool({
    description:
      "Overwrite the persistent memory file with the given content. Read first if you want to preserve existing notes.",
    inputSchema: z.object({ content: z.string() }),
    execute: async ({ content }) => {
      await writeFile(MEMORY_FILE, content);
      return "ok";
    },
  })
};

const search_tools = {
  tavily_search: tool({
    description: "Search the web with Tavily and return the top results as JSON.",
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }) => {
      const r = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, max_results: 5 }),
      });
      return JSON.stringify(await r.json());
    },
  }),
};

const tools = { ...memory_tools, ...search_tools }

const run = (messages: ModelMessage[]) =>
  generateText({
    model: "google/gemini-2.5-flash",
    tools,
    stopWhen: stepCountIs(20),
    system:
      "You are a helpful assistant with a persistent memory file and a web search tool. Use read_memory at the start of a conversation if relevant context might exist, and write_memory to save anything the user might want to remember later. Use tavily_search for current information.",
    messages,
    experimental_telemetry: { isEnabled: true, tracer: getTracer() },
  });

// Test locally: pnpm try "your prompt"
if (process.argv[2]) {
  const { text } = await run([{ role: "user", content: process.argv[2] }]);
  console.log(text);
  await Laminar.flush();
  process.exit(0);
}

// Telegram bot
const messages: ModelMessage[] = []
const bot = new Bot(process.env.TELEGRAM_TOKEN!);
bot.on("message:text", async (ctx) => {
  messages.push({ role: "user", content: ctx.message.text });
  const result = await run(messages);
  messages.push(...result.response.messages);
  await ctx.reply(result.text.slice(0, 4096));
});
bot.start();
