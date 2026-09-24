import { execFile, type ExecFileOptionsWithStringEncoding } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";

// Shared plumbing for every server-side route that shells out to the
// `claude` CLI in headless print mode (Research, Market Summary) instead of
// calling the Anthropic API directly — runs under whatever account is
// logged into Claude Code on this machine, not a separate metered API key.
// See src/lib/researchAgent.ts's doc comment for the full trade-off.

export const execFileAsync = promisify(execFile);

let resolvedClaudeExePromise: Promise<string> | null = null;

/**
 * Resolves the real `claude` executable to spawn. Node's execFile can't
 * launch a .cmd/.bat directly on Windows (EINVAL) without going through a
 * shell, and shell invocation only safely handles simple arguments (Node
 * does not escape them, just concatenates), which breaks once
 * --system-prompt carries markdown full of quotes/backticks/#. `where
 * claude` can return either kind of install on Windows depending on how
 * Claude Code was set up:
 *   - npm global install → a `.cmd` shim on PATH, wrapping a real .exe
 *     elsewhere — read the shim's contents and extract that inner path.
 *   - native installer → `claude.exe` directly on PATH (e.g.
 *     `~\.local\bin\claude.exe`) — already a normal PE binary, use as-is.
 * Either way we end up execFile-ing a .exe directly, never a shell. Cached
 * after the first *successful* call only — caching a rejected promise would
 * permanently break every route using this until the server restarts, over
 * what's usually a transient blip (a momentary PATH/shell hiccup, not a
 * real "Claude Code isn't installed" state).
 */
export async function resolveClaudeExecutable(): Promise<string> {
  if (resolvedClaudeExePromise) return resolvedClaudeExePromise;

  const attempt = (async () => {
    if (process.platform !== "win32") return "claude";

    const { stdout } = await execFileAsync("where", ["claude"], { timeout: 10_000 });
    const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    const exePath = lines.find((line) => line.toLowerCase().endsWith(".exe"));
    if (exePath) return exePath;

    const cmdPath = lines.find((line) => line.toLowerCase().endsWith(".cmd"));
    if (!cmdPath) throw new Error(`\`where claude\` found no .exe or .cmd on PATH (got: ${lines.join(", ") || "nothing"}).`);

    const shimContents = readFileSync(cmdPath, "utf-8");
    const match = shimContents.match(/"([^"]+\.exe)"/i);
    if (!match) throw new Error(`Could not find the wrapped .exe path inside ${cmdPath}.`);

    // The shim references itself via %dp0% (its own directory) — resolve that.
    const dp0 = cmdPath.replace(/[^\\]+$/, "");
    return match[1].replace(/%dp0%\\?/i, dp0);
  })();

  resolvedClaudeExePromise = attempt;
  try {
    return await attempt;
  } catch (err) {
    resolvedClaudeExePromise = null; // let the next call try again instead of replaying this failure forever
    throw err;
  }
}

// If `npm run dev` itself happens to be started from inside a Claude Code
// session (e.g. this repo's own dev workflow, or a course instructor
// debugging live), the dev server process inherits that session's
// CLAUDECODE / CLAUDE_CODE_* / CLAUDE_* env vars (session id, SSE port,
// messaging socket/token, ...). A nested `claude -p` child spawned from
// here would inherit them too and can end up behaving like a sub-session of
// that *other* session instead of a clean standalone one — unpredictable,
// sometimes-instant failures with no stdout/stderr. Stripping them gives
// every headless call a clean identity regardless of how the server itself
// was launched.
export function cleanChildEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^CLAUDE/i.test(key)) delete env[key];
  }
  return env;
}

export type ClaudePrintResult = { is_error?: boolean; subtype?: string; result?: string };

/**
 * Runs `claude -p <prompt> --system-prompt <systemPrompt> --output-format json`
 * and returns the parsed result text. `timeoutMs` should leave real headroom
 * — a Sonnet call doing real work regularly takes well over a minute.
 */
export async function runClaudePrint(
  prompt: string,
  systemPrompt: string,
  opts: { allowedTools?: string; model?: string; effort?: string; timeoutMs?: number } = {}
): Promise<string> {
  const claudeExe = await resolveClaudeExecutable();

  const args = [
    "-p",
    prompt,
    "--system-prompt",
    systemPrompt,
    "--model",
    opts.model ?? "sonnet",
    "--effort",
    opts.effort ?? "medium",
    "--output-format",
    "json",
  ];
  if (opts.allowedTools) args.push("--allowedTools", opts.allowedTools);

  const { stdout } = await execFileAsync(claudeExe, args, {
    // execFile leaves stdin as an open, unclosed pipe by default — the CLI
    // waits ~3s to see if anything arrives on it, which is real observed
    // flakiness (see researchAgent.ts history). Closing it explicitly
    // removes the ambiguity instead of racing it.
    timeout: opts.timeoutMs ?? 300_000,
    maxBuffer: 10 * 1024 * 1024,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: cleanChildEnv(),
  } as ExecFileOptionsWithStringEncoding & { stdio: readonly ["ignore", "pipe", "pipe"] });

  let parsed: ClaudePrintResult;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error("Claude Code returned non-JSON output — is the CLI installed and on PATH?");
  }

  if (parsed.is_error || parsed.subtype !== "success") {
    throw new Error(parsed.result || "Claude Code call failed.");
  }
  if (!parsed.result) {
    throw new Error("No text in Claude Code's response.");
  }
  return parsed.result;
}
