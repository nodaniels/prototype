"""Export building PDF data to assets and JSON for the React Native app.

Features added:
- Optional push to Firebase Realtime Database via REST API.

Usage examples:
    # just export to local app assets/data
    python export_building_data.py

    # export and push to Firebase (db url can also be provided via FIREBASE_DB_URL env)
    python export_building_data.py --push-to-firebase --db-url https://your-db.firebaseio.com --auth YOUR_AUTH_TOKEN
"""

from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path
from typing import Dict, Any, Optional

import requests

from pdf_parser import BuildingManager

ROOT = Path(__file__).resolve().parent
BUILDINGS_DIR = ROOT / "bygninger"
OUTPUT_DIR = ROOT / "wayinreact"
ASSETS_DIR = OUTPUT_DIR / "assets"
DATA_DIR = OUTPUT_DIR / "src" / "data"


def slugify(value: str) -> str:
    """Create a filesystem and object-key safe slug."""
    slug = re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")
    return slug or "item"


def ensure_dirs(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def export_buildings() -> Dict[str, Any]:
    manager = BuildingManager(str(BUILDINGS_DIR))
    buildings = manager.get_available_buildings()
    exported: Dict[str, Any] = {"buildings": {}}

    if not buildings:
        raise RuntimeError(f"No buildings found in {BUILDINGS_DIR}")

    for building in buildings:
        if not manager.load_building_floors(building):
            print(f"Skipping {building}: failed to load floors")
            continue

        building_slug = slugify(building)
        building_assets_dir = ASSETS_DIR / building_slug
        ensure_dirs(building_assets_dir)

        floors_payload: Dict[str, Any] = {}
        for floor_name, parser in manager.floors.items():
            floor_slug = slugify(floor_name)
            image_path = building_assets_dir / f"{floor_slug}.png"

            image = parser.render_pdf_as_image(scale=2.0)
            if image is None:
                print(f"  ! Skipping image export for {building}/{floor_name}: render failed")
                continue

            image.save(image_path)

            floors_payload[floor_slug] = {
                "originalName": floor_name,
                "image": f"{building_slug}/{floor_slug}.png",
                "rooms": manager.all_rooms.get(floor_name, []),
                "entrances": manager.all_entrances.get(floor_name, []),
            }

        exported["buildings"][building_slug] = {
            "originalName": building,
            "floors": floors_payload,
        }

        manager.close_all()

    return exported


def write_json(data: Dict[str, Any], path: Path) -> None:
    ensure_dirs(path.parent)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def write_floor_images_ts(data: Dict[str, Any], path: Path) -> None:
    lines = [
        "export const floorImages = {",
    ]

    for building_slug, building in data["buildings"].items():
        lines.append(f"  '{building_slug}': {{")
        for floor_slug, floor in building["floors"].items():
            relative_path = floor["image"].replace("\\", "/")
            lines.append(
                f"    '{floor_slug}': require('../../assets/{relative_path}'),"
            )
        lines.append("  },")
    lines.append("} as const;\n")

    ensure_dirs(path.parent)
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Export building data and optionally push to Firebase.")
    parser.add_argument("--push-to-firebase", action="store_true", help="Push generated JSON to a Firebase Realtime Database")
    parser.add_argument("--use-admin", action="store_true", help="Use firebase-admin SDK and a service account JSON to write to the DB")
    parser.add_argument("--service-account", type=str, default=os.environ.get("FIREBASE_SERVICE_ACCOUNT"), help="Path to Firebase service account JSON (for admin SDK)")
    parser.add_argument("--db-url", type=str, default=os.environ.get("FIREBASE_DB_URL"), help="Firebase DB root URL (e.g. https://<project>-default-rtdb.firebaseio.com)")
    parser.add_argument("--auth", type=str, default=os.environ.get("FIREBASE_AUTH"), help="Optional Firebase auth token / database secret")
    args = parser.parse_args()

    data = export_buildings()
    write_json(data, DATA_DIR / "buildings.json")
    write_floor_images_ts(data, DATA_DIR / "floorImages.ts")

    if args.push_to_firebase:
        db_url = args.db_url
        if not db_url:
            raise RuntimeError("Firebase DB URL not provided. Set --db-url or FIREBASE_DB_URL env var")
        # If admin SDK is requested and service account provided, use it
        if args.use_admin:
            service_account = args.service_account
            if not service_account:
                raise RuntimeError("Service account JSON path not provided. Set --service-account or FIREBASE_SERVICE_ACCOUNT env var")
            print(f"Pushing data to Firebase using admin SDK (service account={service_account})")
            try:
                import firebase_admin
                from firebase_admin import credentials, db as firebase_db

                cred = credentials.Certificate(service_account)
                # Initialize app with explicit databaseURL
                firebase_admin.initialize_app(cred, {"databaseURL": db_url})
                ref = firebase_db.reference("/buildings")
                ref.set(data)
                print("Push to Firebase (admin) successful.")
            except Exception as exc:
                print(f"Failed to push to Firebase using admin SDK: {exc}")
        else:
            # push under root 'buildings' key via REST
            target = db_url.rstrip("/") + "/buildings.json"
            params = {"auth": args.auth} if args.auth else None
            print(f"Pushing data to Firebase via REST: {target}")
            try:
                resp = requests.put(target, params=params, json=data, timeout=30)
                resp.raise_for_status()
                print("Push to Firebase successful.")
            except Exception as exc:
                print(f"Failed to push to Firebase: {exc}")

    print("Export completed.")


if __name__ == "__main__":
    main()
