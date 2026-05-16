# hello-world-agent

Building an agent is easy. This agent is one file, less than 100 lines.

## Built with

### 1. Laminar
See inside your agent. What your agent was thinking, tool calls, LLM calls, etc.

Sign in at [laminar.sh](https://laminar.sh), create a project, copy the project API key. That's your `LMNR_PROJECT_API_KEY`. Traces will appear under that project.

### 2. Telegram
Message your bot with telegram!

open [@BotFather](https://t.me/BotFather) in Telegram, send `/newbot`, pick a name and a username ending in `bot`. BotFather replies with an HTTP API token like `123456:ABC-DEF...` — that's your `TELEGRAM_TOKEN`.

### 3. Vercel AI SDK
Helpful structure and utils for building an agent

### 4. Vercel AI Gateway
For using Gemini (or any other model)

Sign in at [vercel.com/ai-gateway](https://vercel.com/ai-gateway), create a key. That's your `AI_GATEWAY_API_KEY`. The default model in `bot.ts` is `google/gemini-2.5-flash`; swap to any [supported model](https://vercel.com/docs/ai-gateway/models) by editing one string.

### 5. Tavily API
Give our agent simple searching abilities

Sign up at [tavily.com](https://tavily.com), copy the API key from the dashboard. That's your `TAVILY_API_KEY`.


## Setup

```bash
pnpm install
cp .env.example .env   # paste in the four keys above
```

## Run

```bash
pnpm try     # chat with the agent in your terminal (type "exit" to quit)
pnpm dev     # Telegram bot with --watch
pnpm start   # Telegram bot, no watch
```

Once `pnpm dev` is running, open your bot in Telegram (search the username you gave BotFather) and DM it. Memory persists across messages in the same chat, written to `./memory.md`.

## Add a tool

In `bot.ts`, add to the `tools` object:

```ts
my_tool: tool({
  description: "What it does.",
  inputSchema: z.object({ arg: z.string() }),
  execute: async ({ arg }) => { /* ... */ return "result"; },
}),
```

The agent will call it autonomously when relevant, and the call will show up as a span in Laminar.
