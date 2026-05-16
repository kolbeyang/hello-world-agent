import { Bot } from "grammy";
import { generateText, stepCountIs, tool, type ModelMessage } from "ai";
import { Laminar, getTracer } from "@lmnr-ai/lmnr";
import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { parseArgs } from "node:util";

Laminar.initialize({ projectApiKey: process.env.LMNR_PROJECT_API_KEY });
const MEMORY_FILE = "./memory.md";

const tools = {
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
      "Overwrite the persistent memory file with the given content. ALWAYS read first, unless you have a very good reason, preserve existing contents when you write as to not overwrite important memories.",
    inputSchema: z.object({ content: z.string() }),
    execute: async ({ content }) => {
      await writeFile(MEMORY_FILE, content);
      return "ok";
    },
  }),
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

const run = (messages: ModelMessage[]) =>
  generateText({
    model: "google/gemini-2.5-flash",
    tools,
    stopWhen: stepCountIs(20),
    system:
      "You are a helpful assistant with a persistent memory file and a web search tool. Use read_memory at the start of a conversation if relevant context might exist, and write_memory to save anything the user might want to remember later. Use the search tool (if provided) for current information.",
    messages,
    experimental_telemetry: { isEnabled: true, tracer: getTracer() },
  });

const { values: { mode } } = parseArgs({ options: { mode: { type: "string" } } });

if (mode === "telegram") {
  const messages: ModelMessage[] = [];
  const bot = new Bot(process.env.TELEGRAM_TOKEN!);
  bot.on("message:text", async (ctx) => {
    messages.push({ role: "user", content: ctx.message.text });
    const result = await run(messages);
    messages.push(...result.response.messages);
    await ctx.reply(result.text.slice(0, 4096));
  });
  bot.start();

} else if (mode === "cli") {
  const rl = createInterface({ input: stdin, output: stdout });
  const messages: ModelMessage[] = [];
  while (true) {
    let line: string;
    try {
      line = (await rl.question("USER: ")).trim();
    } catch {
      break;
    }
    if (line === "exit") break;
    if (!line) continue;
    messages.push({ role: "user", content: line });
    const result = await run(messages);
    messages.push(...result.response.messages);
    console.log(`\nAGENT: ${result.text}\n`);
  }
  await Laminar.flush();
  process.exit(0);

} else {
  console.error("Specify --mode telegram or --mode cli");
  process.exit(1);
}
