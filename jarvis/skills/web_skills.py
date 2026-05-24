"""Web-based skills — search, weather, date/time."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

import requests
from rich.console import Console

import config

console = Console()

_SESSION = requests.Session()
_SESSION.headers["User-Agent"] = (
    "Mozilla/5.0 (compatible; Jarvis-Assistant/1.0; +https://github.com)"
)


# ── Web search (DuckDuckGo Instant Answer API) ───────────────────────────────

def search_web(query: str) -> str:
    """
    Search the web using DuckDuckGo's free Instant Answer API.
    Returns a plain-text summary of results.
    """
    try:
        resp = _SESSION.get(
            "https://api.duckduckgo.com/",
            params={
                "q": query,
                "format": "json",
                "no_html": "1",
                "skip_disambig": "1",
                "no_redirect": "1",
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        results = []

        # Instant answer / abstract
        if data.get("AbstractText"):
            results.append(data["AbstractText"])

        # Related topics
        for topic in data.get("RelatedTopics", [])[:3]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append(topic["Text"])

        if results:
            return "\n".join(results[:3])

        # Fallback: direct answer
        if data.get("Answer"):
            return data["Answer"]

        return f"No instant results found for '{query}'. Try asking me to open a browser and search."

    except requests.RequestException as exc:
        return f"Search failed: {exc}"


# ── Weather (wttr.in — free, no API key needed) ─────────────────────────────

def get_weather(city: Optional[str] = None) -> str:
    """
    Get the current weather for a city.

    Uses the free wttr.in service — no API key required.
    """
    location = city or config.DEFAULT_CITY

    try:
        resp = _SESSION.get(
            f"https://wttr.in/{requests.utils.quote(location)}",
            params={"format": "j1"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        current = data["current_condition"][0]
        area = data["nearest_area"][0]

        area_name = area["areaName"][0]["value"]
        country = area["country"][0]["value"]

        temp_c = current["temp_C"]
        temp_f = current["temp_F"]
        feels_c = current["FeelsLikeC"]
        feels_f = current["FeelsLikeF"]
        desc = current["weatherDesc"][0]["value"]
        humidity = current["humidity"]
        wind_kmph = current["windspeedKmph"]
        wind_dir = current["winddir16Point"]

        # Today's forecast
        today = data["weather"][0]
        max_c = today["maxtempC"]
        min_c = today["mintempC"]
        max_f = today["maxtempF"]
        min_f = today["mintempF"]

        return (
            f"Weather in {area_name}, {country}: {desc}. "
            f"Current temperature {temp_c}°C ({temp_f}°F), feels like {feels_c}°C ({feels_f}°F). "
            f"Humidity {humidity}%, wind {wind_kmph} km/h {wind_dir}. "
            f"Today's range: {min_c}°C to {max_c}°C ({min_f}°F to {max_f}°F)."
        )

    except Exception as exc:
        return f"Could not retrieve weather for '{location}': {exc}"


# ── Date / Time ─────────────────────────────────────────────────────────────

def get_datetime() -> str:
    """Return the current date and time in a natural language format."""
    now = datetime.now()
    day_name = now.strftime("%A")
    date_str = now.strftime("%B %d, %Y")
    time_str = now.strftime("%I:%M %p").lstrip("0")
    return f"It is {day_name}, {date_str}, {time_str}."
