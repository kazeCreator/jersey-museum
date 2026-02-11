#!/usr/bin/env python3
import argparse
import json
import os
import pathlib
import sys
import urllib.request

SECRET_PATH = pathlib.Path.home() / ".openclaw" / "workspace" / ".secrets" / "flomo_webhook_url"


def get_webhook() -> str:
    env = os.environ.get("FLOMO_WEBHOOK_URL", "").strip()
    if env:
        return env
    if SECRET_PATH.exists():
        return SECRET_PATH.read_text(encoding="utf-8").strip()
    raise SystemExit("Missing webhook: set FLOMO_WEBHOOK_URL or ~/.openclaw/workspace/.secrets/flomo_webhook_url")


def read_content(args: argparse.Namespace) -> str:
    if args.file:
        return pathlib.Path(args.file).read_text(encoding="utf-8").strip()
    return (args.text or "").strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="Post memo to flomo webhook")
    parser.add_argument("text", nargs="?", help="memo text")
    parser.add_argument("--file", help="read memo text from file")
    parser.add_argument("--tags", default="", help="tags like '#idea #work'")
    args = parser.parse_args()

    content = read_content(args)
    if not content:
        print("Empty memo content", file=sys.stderr)
        return 2

    tags = args.tags.strip()
    if tags:
        content = f"{content}\n\n{tags}"

    data = json.dumps({"content": content}).encode("utf-8")
    req = urllib.request.Request(
        get_webhook(),
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"Post failed: {e}", file=sys.stderr)
        return 1

    if '"code":0' in body or '"message":"success"' in body.lower():
        print("OK: memo sent to flomo")
        return 0

    # flomo sometimes still returns successful payload without the above exact keys.
    print(f"Response: {body}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
