"""
Web Analyzer

Fetches a website URL, extracts metadata and structural cues,
and returns a findings dict. This module is lightweight and
uses `httpx` + `beautifulsoup4` (if available) for robust parsing.
"""
import logging
import httpx
from urllib.parse import urlparse, urljoin

try:
    from bs4 import BeautifulSoup
except Exception:
    BeautifulSoup = None

logger = logging.getLogger(__name__)


async def fetch_url(url: str, timeout: float = 10.0) -> dict:
    """Fetch the URL and return status, headers and text (limited).

    Returns a dict: {status_code, headers, text, final_url}
    """
    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=timeout
    ) as client:
        resp = await client.get(url)
        # Limit body length to avoid huge downloads
        body = resp.text
        if len(body) > 200_000:
            body = body[:200_000]
        return {
            "status_code": resp.status_code,
            "headers": dict(resp.headers),
            "text": body,
            "final_url": str(resp.url)
        }


def _extract_with_bs4(html: str, base_url: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    meta_desc = ""
    m = soup.find("meta", attrs={"name": "description"})
    if not m:
        m = soup.find("meta", attrs={"property": "og:description"})
    if m and m.get("content"):
        meta_desc = m.get("content").strip()

    h1 = [h.get_text(strip=True) for h in soup.find_all("h1")][:3]
    links = []
    for a in soup.find_all("a", href=True)[:200]:
        href = a.get("href")
        if href:
            links.append(urljoin(base_url, href))

    images = [
        urljoin(base_url, img.get("src"))
        for img in soup.find_all("img", src=True)
    ][:100]
    scripts = [s.get("src") or "inline" for s in soup.find_all("script")][:100]
    forms = []
    for f in soup.find_all("form"):
        forms.append({
            "action": f.get("action"),
            "method": f.get("method", "get").lower(),
            "inputs": [
                i.get("name") for i in
                f.find_all(["input", "textarea", "select"])
                if i.get("name")
            ][:20]
        })

    # Look for common trust signals
    text_blob = soup.get_text(separator=" \n ", strip=True)[:10000]

    return {
        "title": title,
        "meta_description": meta_desc,
        "h1": h1,
        "num_links": len(links),
        "sample_links": links[:25],
        "num_images": len(images),
        "sample_images": images[:10],
        "scripts": scripts[:20],
        "forms": forms[:10],
        "text_snippet": text_blob
    }


def _extract_basic(html: str, base_url: str) -> dict:
    # Fallback basic extraction if BeautifulSoup not installed
    title = ""
    meta_description = ""
    text_snippet = html[:10000]
    return {
        "title": title,
        "meta_description": meta_description,
        "h1": [],
        "num_links": 0,
        "sample_links": [],
        "num_images": 0,
        "sample_images": [],
        "scripts": [],
        "forms": [],
        "text_snippet": text_snippet
    }


async def analyze_url(url: str) -> dict:
    """High-level analysis: fetch, parse, and create a findings dict.

    The findings dict contains basic host info, headers, and structural cues
    that can be fed to an LLM for a deeper legitimacy assessment.
    """
    parsed = urlparse(url)
    if not parsed.scheme:
        # default to https
        url = "https://" + url
        parsed = urlparse(url)

    scheme = parsed.scheme
    host = parsed.netloc

    try:
        resp = await fetch_url(url)
    except Exception as e:
        logger.error(f"Failed to fetch url {url}: {e}")
        return {"error": f"Fetch failed: {e}", "url": url}

    content_type = resp["headers"].get("content-type", "")

    extract = None
    if BeautifulSoup and "html" in content_type.lower():
        extract = _extract_with_bs4(resp["text"], resp["final_url"])
    else:
        extract = _extract_basic(resp["text"], resp["final_url"])

    # Heuristics
    findings = {
        "requested_url": url,
        "final_url": resp.get("final_url"),
        "status_code": resp.get("status_code"),
        "content_type": content_type,
        "host": host,
        "scheme": scheme,
        **extract
    }

    # Basic heuristics for obvious red flags
    flags = []
    if resp.get("status_code") and resp.get("status_code") >= 400:
        flags.append("fetch_error_http_status")
    if scheme != "https":
        flags.append("not_https")
    if len(extract.get("text_snippet", "")) < 200:
        flags.append("very_short_text")

    # suspicious keywords
    suspicious_words = [
        "free",
        "winner",
        "congratulations",
        "claim prize",
        "click here to win",
        "download now",
    ]
    low = extract.get("text_snippet", "").lower()
    for w in suspicious_words:
        if w in low:
            flags.append("suspicious_keywords")
            break

    findings["flags"] = flags

    return {"findings": findings}
