import json
import logging
import os
import re
from typing import Any, Dict, Iterable, List, Optional


def _iterable(items: Any) -> Iterable[Any]:
    if items is None:
        return []
    if isinstance(items, (list, tuple)):
        return items
    return [items]


class CRMEnrichmentConfig:
    """Holds the CRM enrichment schema and normalization rules."""

    def __init__(self, config: Dict[str, Any], source: str):
        if not isinstance(config, dict):
            raise ValueError("CRM enrichment config must be a JSON object.")
        self._raw = config
        self.source = source
        self.field_definitions: List[Dict[str, Any]] = []
        self.field_names: List[str] = []
        self.normalizers: Dict[str, str] = {}

        for entry in _iterable(self._raw.get("fields")):
            field_config = self._coerce_field(entry)
            if not field_config:
                continue
            if not field_config.get("persist", True):
                continue
            name = field_config["name"]
            if name in self.field_names:
                continue
            self.field_names.append(name)
            self.field_definitions.append(field_config)
            normalizer = field_config.get("normalizer")
            if isinstance(normalizer, str):
                self.normalizers[name] = normalizer

        configured_priority = self._raw.get("memory_priority")
        if isinstance(configured_priority, list) and configured_priority:
            self.memory_priority = [
                key for key in configured_priority if key in self.field_names
            ]
        else:
            default_priority = [
                field["name"]
                for field in self.field_definitions
                if field.get("include_in_memory", True)
            ]
            seen = set()
            ordered = []
            for key in default_priority + self.field_names:
                if key not in seen:
                    seen.add(key)
                    ordered.append(key)
            self.memory_priority = ordered

    @staticmethod
    def _coerce_field(entry: Any) -> Optional[Dict[str, Any]]:
        if isinstance(entry, str):
            return {"name": entry}
        if isinstance(entry, dict):
            name = entry.get("name")
            if isinstance(name, str) and name.strip():
                coerced = dict(entry)
                coerced["name"] = name.strip()
                return coerced
        return None

    def normalize(self, payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        if not payload:
            return {}
        normalized: Dict[str, Any] = {}
        for key, value in payload.items():
            if key not in self.field_names:
                continue
            cleaned_value = self._normalize_value(key, value)
            if cleaned_value not in (None, ""):
                normalized[key] = cleaned_value
        return normalized

    def _normalize_value(self, key: str, value: Any) -> Any:
        if value is None:
            return None
        normalizer = self.normalizers.get(key)
        if isinstance(value, str):
            raw = value.strip()
        else:
            raw = value

        if raw in (None, ""):
            return None

        if normalizer == "email" and isinstance(raw, str):
            return raw.lower()
        if normalizer == "phone" and isinstance(raw, str):
            return re.sub(r"[^0-9+]+", "", raw)
        if normalizer == "lowercase" and isinstance(raw, str):
            return raw.lower()
        if normalizer == "titlecase" and isinstance(raw, str):
            return raw.title()
        if normalizer == "number" and isinstance(raw, str):
            try:
                return int(raw)
            except ValueError:
                try:
                    return float(raw)
                except ValueError:
                    return raw
        if normalizer == "json" and isinstance(raw, str):
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return raw
        return raw


def load_crm_enrichment_config(path: Optional[str]) -> CRMEnrichmentConfig:
    """Load CRM enrichment configuration from a JSON file."""

    if not path:
        raise ValueError("CRM profile config path is required.")

    resolved = os.path.abspath(path)
    if not os.path.exists(resolved):
        raise FileNotFoundError(f"CRM profile config path {resolved} not found.")

    try:
        with open(resolved, "r", encoding="utf-8") as handle:
            user_config = json.load(handle)
    except json.JSONDecodeError as exc:
        raise ValueError(f"CRM profile config at {resolved} contains invalid JSON: {exc}") from exc
    except Exception as exc:  # pragma: no cover - defensive
        raise RuntimeError(f"Failed to load CRM profile config from {resolved}: {exc}") from exc

    logging.info("CRM enrichment configuration loaded from %s", resolved)
    return CRMEnrichmentConfig(user_config, source=resolved)
