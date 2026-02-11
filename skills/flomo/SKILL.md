---
name: flomo
description: Capture notes to flomo quickly via Incoming Webhook URL. Use when the user asks to save an idea/memo to flomo, append tags, or quickly log thoughts from chat into flomo.
---

# flomo

Use this skill to write notes into flomo with a webhook.

## Required config

Set webhook URL in one of these ways:

1. Environment variable `FLOMO_WEBHOOK_URL`
2. Local secret file `~/.openclaw/workspace/.secrets/flomo_webhook_url`

Never print the full webhook URL in chat.

## Save a memo

```bash
python3 {baseDir}/scripts/flomo_post.py "Your memo text"
```

## Save memo with tags

```bash
python3 {baseDir}/scripts/flomo_post.py "Idea about product" --tags "#idea #product"
```

## Save multiline memo

```bash
python3 {baseDir}/scripts/flomo_post.py --file /path/to/text.txt --tags "#clip"
```

## Rules

- Ask before sending sensitive/private content to flomo.
- Keep memos concise and readable.
- Prefer adding 1-3 useful tags.
- On success, confirm briefly (do not leak webhook).
