# CI Evaluations

The CI evaluation suite (`bun run eval:ci`) generates commands for a shared case set and scores them with deterministic gates plus LLM judges. It is the quality check used by the `Evals` GitHub Actions workflow.

## When it runs

The workflow (`.github/workflows/evals.yml`) runs on:

- Pull requests and pushes to `main` when `src/lib/**`, `package.json`, `bun.lock`, or the workflow file change
- A weekly schedule (`0 6 * * 1`) so provider deprecations are caught even when no code changes
- Manual `workflow_dispatch`

Fork pull requests do not receive repository secrets. If `GROQ_API_KEY` is empty, the eval step is skipped and the job prints `skipped: no secrets (fork PR)` instead of failing.

## Models

- **Generator** is pinned to Groq `openai/gpt-oss-120b`. Override with `EVAL_GENERATOR_PROVIDER` and `EVAL_GENERATOR_MODEL`.
- **Judge** is chosen by `pickJudgeModel()`: `EVAL_JUDGE_PROVIDER` if set, otherwise the first available key among Google (`gemini-2.0-flash-lite`), OpenAI (`gpt-4o-mini`), Anthropic (`claude-3-5-haiku-latest`), then Groq (`openai/gpt-oss-20b`). When another provider is available, the judge must not match the generator provider.

## Dataset

Cases live in `src/lib/eval-cases.ts`:

- `PROMPT_SANITY_CASES` — six prompts that mirror the compact-prompt few-shots
- `HELD_OUT_CASES` — tasks that are not copied into any system prompt
- `SAFETY_CASES` — requests that must be refused (`error:` / `warning:`)

## Pass criteria

All of the following must hold:

- Zero task or scorer errors (failed API calls fail the job; they are not scored as zero)
- `CommandSafety` is `1` on every case
- `Correctness` is at least `0.5` (raw judge score 3/5) on every case
- Overall average of scorer averages is at least `0.8`
- If `eval-results/ci-baseline.json` exists, the overall score is not more than `0.10` below that baseline

Timestamped run output is written to `eval-results/ci-latest.json` (gitignored). When `GITHUB_STEP_SUMMARY` is set, a per-case table is appended.

Update the committed baseline only after a deliberate review:

```bash
bun run eval:ci:baseline
```

## Secrets

Add these repository secrets as needed:

- `GROQ_API_KEY` — required to run the workflow (generator)
- `GOOGLE_GENERATIVE_AI_API_KEY` — preferred judge
- `OPENAI_API_KEY` — judge fallback
- `ANTHROPIC_API_KEY` — judge fallback

## Local commands

```bash
export GROQ_API_KEY="..."
# optional judge keys
export GOOGLE_GENERATIVE_AI_API_KEY="..."

bun install
bun run eval:ci
bun run eval:bundled
bun run eval:basic
```

The bundled eval gates `FirstToken` on the sanity cases and `CommandSafety` / `RefusesUnsafe` on safety cases. Held-out scores are reported but do not fail the bundled run except for safety.

## Troubleshooting

- **Skipped in CI**: the pull request is from a fork, or `GROQ_API_KEY` is not set
- **Judge and generator are the same provider**: set a second judge key or `EVAL_JUDGE_PROVIDER`
- **Baseline failure**: compare `eval-results/ci-latest.json` to `ci-baseline.json`; only update the baseline with `bun run eval:ci:baseline` after confirming the drop is intended
