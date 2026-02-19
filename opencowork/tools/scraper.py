"""Web Scraping Tools for OpenCowork

Provides capabilities for:
- Fetching web content
- Parsing HTML
- Extracting data with CSS selectors or XPath
- Following links
- Rate limiting and politeness
"""

import logging
import asyncio
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import hashlib

logger = logging.getLogger(__name__)


class WebScrapingTool(ABC):
    """Abstract base class for web scraping"""

    @abstractmethod
    async def fetch(self, url: str, timeout: int = 30) -> Dict[str, Any]:
        """Fetch web page"""
        pass

    @abstractmethod
    async def find_elements(self, selector: str) -> List[Dict[str, Any]]:
        """Find elements using CSS selector"""
        pass

    @abstractmethod
    async def find_links(self) -> List[str]:
        """Find all links on the page"""
        pass

    @abstractmethod
    async def extract_data(self, selectors: Dict[str, str]) -> Dict[str, Any]:
        """Extract structured data from page"""
        pass

    @abstractmethod
    async def get_text(self, selector: str) -> str:
        """Get text from element"""
        pass

    @abstractmethod
    async def get_attribute(self, selector: str, attribute: str) -> str:
        """Get element attribute"""
        pass


class BeautifulSoupScrapingTool(WebScrapingTool):
    """Web scraping using BeautifulSoup"""

    def __init__(self, rate_limit_requests: int = 10, rate_limit_window_seconds: int = 60):
        """
        Initialize scraping tool

        Args:
            rate_limit_requests: Max requests per window
            rate_limit_window_seconds: Rate limit window
        """
        self.rate_limit_requests = rate_limit_requests
        self.rate_limit_window_seconds = rate_limit_window_seconds
        self.request_times = []
        self.content = None
        self.soup = None
        self.current_url = None

    async def _check_rate_limit(self) -> bool:
        """Check if request is within rate limit"""
        now = datetime.now()
        cutoff = now - timedelta(seconds=self.rate_limit_window_seconds)

        # Remove old requests
        self.request_times = [t for t in self.request_times if t > cutoff]

        # Check limit
        if len(self.request_times) >= self.rate_limit_requests:
            wait_time = (self.request_times[0] - cutoff).total_seconds()
            logger.warning(f"Rate limit exceeded. Waiting {wait_time:.1f} seconds")
            await asyncio.sleep(max(0.1, wait_time + 0.1))
            return True

        self.request_times.append(now)
        return True

    async def fetch(self, url: str, timeout: int = 30) -> Dict[str, Any]:
        """Fetch and parse web page"""
        try:
            await self._check_rate_limit()

            import httpx
            from bs4 import BeautifulSoup

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    timeout=timeout,
                    headers={"User-Agent": "OpenCowork/1.0 (+http://opencowork.ai)"},
                )

                response.raise_for_status()

                self.content = response.text
                self.current_url = str(response.url)
                self.soup = BeautifulSoup(self.content, "html.parser")

                return {
                    "status": "success",
                    "url": self.current_url,
                    "status_code": response.status_code,
                    "content_length": len(self.content),
                    "title": self.soup.title.string if self.soup.title else None,
                }
        except Exception as e:
            logger.error(f"Fetch failed: {e}")
            return {"status": "error", "message": str(e)}

    async def find_elements(self, selector: str) -> List[Dict[str, Any]]:
        """Find elements using CSS selector"""
        try:
            if not self.soup:
                raise RuntimeError("No content loaded. Call fetch() first.")

            elements = self.soup.select(selector)

            return [
                {
                    "text": elem.get_text(strip=True),
                    "html": str(elem),
                    "attributes": elem.attrs,
                }
                for elem in elements
            ]
        except Exception as e:
            logger.error(f"Find elements failed: {e}")
            return []

    async def find_links(self) -> List[str]:
        """Find all links on page"""
        try:
            if not self.soup:
                raise RuntimeError("No content loaded. Call fetch() first.")

            from urllib.parse import urljoin

            links = []
            for link in self.soup.find_all("a", href=True):
                href = link["href"]
                # Convert to absolute URL
                absolute_url = urljoin(self.current_url, href)
                links.append(absolute_url)

            return links
        except Exception as e:
            logger.error(f"Find links failed: {e}")
            return []

    async def extract_data(self, selectors: Dict[str, str]) -> Dict[str, Any]:
        """
        Extract structured data using selectors

        Args:
            selectors: Dict of {field_name: css_selector}

        Returns:
            Dict with extracted data
        """
        try:
            if not self.soup:
                raise RuntimeError("No content loaded. Call fetch() first.")

            data = {}

            for field_name, selector in selectors.items():
                elements = self.soup.select(selector)

                if not elements:
                    data[field_name] = None
                elif len(elements) == 1:
                    data[field_name] = elements[0].get_text(strip=True)
                else:
                    data[field_name] = [elem.get_text(strip=True) for elem in elements]

            return {"status": "success", "data": data}
        except Exception as e:
            logger.error(f"Extract data failed: {e}")
            return {"status": "error", "message": str(e)}

    async def get_text(self, selector: str) -> str:
        """Get text from element"""
        try:
            if not self.soup:
                raise RuntimeError("No content loaded. Call fetch() first.")

            elements = self.soup.select(selector)

            if not elements:
                return ""

            if len(elements) == 1:
                return elements[0].get_text(strip=True)

            # Return joined text of multiple elements
            return " ".join([elem.get_text(strip=True) for elem in elements])
        except Exception as e:
            logger.error(f"Get text failed: {e}")
            return ""

    async def get_attribute(self, selector: str, attribute: str) -> str:
        """Get element attribute"""
        try:
            if not self.soup:
                raise RuntimeError("No content loaded. Call fetch() first.")

            elements = self.soup.select(selector)

            if not elements:
                return ""

            return elements[0].get(attribute, "")
        except Exception as e:
            logger.error(f"Get attribute failed: {e}")
            return ""

    def get_hash(self) -> str:
        """Get hash of current content for caching"""
        if not self.content:
            return ""

        return hashlib.md5(self.content.encode()).hexdigest()


class AdvancedDataExtractor:
    """Advanced data extraction from HTML"""

    def __init__(self, soup):
        self.soup = soup

    def extract_tables(self) -> List[List[Dict[str, str]]]:
        """Extract all tables from page"""
        tables = []

        for table in self.soup.find_all("table"):
            rows = []

            # Extract headers
            headers = []
            for th in table.find_all("th"):
                headers.append(th.get_text(strip=True))

            # Extract data rows
            for tr in table.find_all("tr"):
                cells = [td.get_text(strip=True) for td in tr.find_all(["td", "th"])]

                if cells:
                    if headers and len(cells) == len(headers):
                        row = {headers[i]: cells[i] for i in range(len(headers))}
                        rows.append(row)
                    else:
                        rows.append({"data": cells})

            if rows:
                tables.append(rows)

        return tables

    def extract_metadata(self) -> Dict[str, str]:
        """Extract metadata from page"""
        metadata = {}

        # Extract title
        if self.soup.title:
            metadata["title"] = self.soup.title.string

        # Extract meta description
        for meta in self.soup.find_all("meta", {"name": "description"}):
            metadata["description"] = meta.get("content", "")

        # Extract meta keywords
        for meta in self.soup.find_all("meta", {"name": "keywords"}):
            metadata["keywords"] = meta.get("content", "")

        # Extract Open Graph tags
        for meta in self.soup.find_all("meta", {"property": True}):
            prop = meta.get("property", "")
            if prop.startswith("og:"):
                metadata[prop] = meta.get("content", "")

        return metadata


class WebScrapingToolFactory:
    """Factory for creating web scraping tools"""

    @staticmethod
    def create(tool_type: str = "beautifulsoup", **kwargs) -> WebScrapingTool:
        """
        Create a web scraping tool

        Args:
            tool_type: beautifulsoup, selenium, etc.
            **kwargs: Tool-specific parameters

        Returns:
            WebScrapingTool instance
        """
        if tool_type == "beautifulsoup":
            return BeautifulSoupScrapingTool(**kwargs)
        else:
            raise ValueError(f"Unknown scraping tool type: {tool_type}")
