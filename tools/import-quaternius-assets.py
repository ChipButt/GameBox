#!/usr/bin/env python3
"""Download the approved Quaternius runtime assets into GameBox.

The source inventory is generated from Quaternius' official public Google Drive
folders. Files keep their original Quaternius filenames. Static packs use FBX;
animated character/animal packs use their authored glTF files; the enemy pack
uses its authored animated FBX files.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

import gdown

ROOT = Path(__file__).resolve().parents[1]
SOURCE_FILE = ROOT / "tools" / "quaternius-import-sources.json"
POOL_ROOT = ROOT / "shared" / "asset-pool"
MANIFEST_FILE = POOL_ROOT / "manifest.json"


def read_sources():
    return json.loads(SOURCE_FILE.read_text(encoding="utf-8"))


def download_one(asset: dict, retries: int = 4) -> tuple[str, int]:
    target = ROOT / asset["target"]
    target.parent.mkdir(parents=True, exist_ok=True)
    expected = asset.get("sourceSize")

    if target.exists() and target.stat().st_size > 0:
        if not expected or target.stat().st_size == expected:
            return ("skip", target.stat().st_size)

    tmp = target.with_suffix(target.suffix + ".part")
    if tmp.exists():
        tmp.unlink()

    last_error = None
    for attempt in range(1, retries + 1):
        try:
            result = gdown.download(
                id=asset["driveFileId"],
                output=str(tmp),
                quiet=True,
                use_cookies=False,
            )
            if not result or not tmp.exists() or tmp.stat().st_size == 0:
                raise RuntimeError("Google Drive returned no file data")
            if expected and tmp.stat().st_size != expected:
                raise RuntimeError(
                    f"size mismatch for {asset['filename']}: "
                    f"{tmp.stat().st_size} != {expected}"
                )
            tmp.replace(target)
            return ("download", target.stat().st_size)
        except Exception as exc:
            last_error = exc
            if tmp.exists():
                tmp.unlink()
            if attempt < retries:
                time.sleep(min(2 ** attempt, 12))

    raise RuntimeError(f"failed to download {asset['id']}: {last_error}")


def existing_assets(source_doc: dict) -> list[dict]:
    result = []
    for asset in source_doc["assets"]:
        target = ROOT / asset["target"]
        if not target.exists() or target.stat().st_size == 0:
            continue
        entry = {
            "id": asset["id"],
            "pack": asset["pack"],
            "packTitle": asset["packTitle"],
            "name": asset["name"],
            "filename": asset["filename"],
            "type": asset["type"],
            "format": asset["format"],
            "animated": asset["animated"],
            "path": str(Path(asset["target"]).relative_to(POOL_ROOT)).replace(os.sep, "/"),
            "byteSize": target.stat().st_size,
            "license": "CC0-1.0",
            "sourcePage": asset["sourcePage"],
            "sourceFolder": asset["sourceFolder"],
        }
        result.append(entry)
    return result


def write_manifest(source_doc: dict) -> None:
    assets = existing_assets(source_doc)
    pack_meta = []
    for pack in source_doc["packs"]:
        count = sum(1 for a in assets if a["pack"] == pack["id"])
        pack_meta.append({
            "id": pack["id"],
            "title": pack["title"],
            "type": pack["kind"],
            "format": pack["format"],
            "animated": pack["animated"],
            "assetCount": count,
            "expectedAssetCount": pack["expected"],
            "complete": count == pack["expected"],
            "sourcePage": pack["page"],
            "sourceFolder": pack["root"],
            "license": "CC0-1.0",
        })

    manifest = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "Quaternius",
        "license": "CC0-1.0",
        "assetRoot": "./",
        "totalAssets": len(assets),
        "expectedTotalAssets": source_doc["totalAssets"],
        "complete": len(assets) == source_doc["totalAssets"],
        "packs": pack_meta,
        "assets": assets,
    }
    POOL_ROOT.mkdir(parents=True, exist_ok=True)
    MANIFEST_FILE.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pack", help="Import only one pack id")
    parser.add_argument("--workers", type=int, default=6)
    args = parser.parse_args()

    source_doc = read_sources()
    wanted = [
        a for a in source_doc["assets"]
        if not args.pack or a["pack"] == args.pack
    ]
    if args.pack and not wanted:
        raise SystemExit(f"Unknown pack: {args.pack}")

    print(f"Importing {len(wanted)} Quaternius assets"
          + (f" from {args.pack}" if args.pack else ""))

    downloaded = 0
    skipped = 0
    total_bytes = 0
    failures = []

    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        futures = {executor.submit(download_one, asset): asset for asset in wanted}
        for future in as_completed(futures):
            asset = futures[future]
            try:
                state, size = future.result()
                total_bytes += size
                if state == "download":
                    downloaded += 1
                else:
                    skipped += 1
                print(f"[{state}] {asset['pack']}/{asset['filename']} ({size} bytes)")
            except Exception as exc:
                failures.append((asset["id"], str(exc)))
                print(f"[failed] {asset['id']}: {exc}", file=sys.stderr)

    write_manifest(source_doc)

    if failures:
        print("\nImport failures:", file=sys.stderr)
        for asset_id, message in failures:
            print(f"- {asset_id}: {message}", file=sys.stderr)
        return 1

    print(
        f"Done: {downloaded} downloaded, {skipped} already present, "
        f"{total_bytes} bytes checked."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
