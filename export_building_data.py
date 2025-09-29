"""Export building PDF data to assets and JSON for the React Native app."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Dict, Any

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
    data = export_buildings()
    write_json(data, DATA_DIR / "buildings.json")
    write_floor_images_ts(data, DATA_DIR / "floorImages.ts")
    print("Export completed.")


if __name__ == "__main__":
    main()
