"""Browser Automation Tools for OpenCowork

Provides capabilities for:
- Navigating to URLs
- Finding and interacting with DOM elements
- Filling forms
- Taking screenshots
- Executing JavaScript
"""

import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)


class BrowserAutomationTool(ABC):
    """Abstract base class for browser automation"""

    @abstractmethod
    async def navigate(self, url: str, timeout: int = 30000) -> Dict[str, Any]:
        """Navigate to a URL"""
        pass

    @abstractmethod
    async def find_element(self, selector: str) -> Dict[str, Any]:
        """Find element by CSS selector"""
        pass

    @abstractmethod
    async def click(self, selector: str) -> Dict[str, Any]:
        """Click an element"""
        pass

    @abstractmethod
    async def fill(self, selector: str, text: str) -> Dict[str, Any]:
        """Fill a form field"""
        pass

    @abstractmethod
    async def select(self, selector: str, value: str) -> Dict[str, Any]:
        """Select option from dropdown"""
        pass

    @abstractmethod
    async def screenshot(self, output_path: Optional[str] = None) -> Dict[str, Any]:
        """Take a screenshot"""
        pass

    @abstractmethod
    async def execute_script(self, script: str) -> Dict[str, Any]:
        """Execute JavaScript"""
        pass

    @abstractmethod
    async def wait_for_element(self, selector: str, timeout: int = 30000) -> Dict[str, Any]:
        """Wait for element to appear"""
        pass

    @abstractmethod
    async def get_text(self, selector: str) -> str:
        """Get element text content"""
        pass

    @abstractmethod
    async def get_attribute(self, selector: str, attribute: str) -> str:
        """Get element attribute"""
        pass

    @abstractmethod
    async def close(self) -> None:
        """Close browser"""
        pass


class PlaywrightBrowserTool(BrowserAutomationTool):
    """Browser automation using Playwright"""

    def __init__(self, headless: bool = True, browser_type: str = "chromium"):
        """
        Initialize Playwright browser tool

        Args:
            headless: Run in headless mode
            browser_type: chromium, firefox, or webkit
        """
        self.headless = headless
        self.browser_type = browser_type
        self.browser = None
        self.page = None
        self._initialized = False

    async def _ensure_initialized(self):
        """Initialize browser if not already done"""
        if self._initialized:
            return

        try:
            from playwright.async_api import async_playwright

            self.playwright = await async_playwright().start()

            if self.browser_type == "firefox":
                self.browser = await self.playwright.firefox.launch(headless=self.headless)
            elif self.browser_type == "webkit":
                self.browser = await self.playwright.webkit.launch(headless=self.headless)
            else:
                self.browser = await self.playwright.chromium.launch(headless=self.headless)

            self._initialized = True
            logger.info(f"Playwright browser initialized ({self.browser_type})")
        except Exception as e:
            logger.error(f"Failed to initialize Playwright: {e}")
            raise

    async def navigate(self, url: str, timeout: int = 30000) -> Dict[str, Any]:
        """Navigate to URL"""
        try:
            await self._ensure_initialized()

            if not self.page:
                self.page = await self.browser.new_page()

            await self.page.goto(url, timeout=timeout)

            return {
                "status": "success",
                "url": self.page.url,
                "title": await self.page.title(),
            }
        except Exception as e:
            logger.error(f"Navigation failed: {e}")
            return {"status": "error", "message": str(e)}

    async def find_element(self, selector: str) -> Dict[str, Any]:
        """Find element by selector"""
        try:
            if not self.page:
                raise RuntimeError("Browser not initialized. Call navigate() first.")

            element = await self.page.query_selector(selector)

            if not element:
                return {"status": "not_found", "selector": selector}

            # Get element info
            box = await element.bounding_box()
            content = await element.inner_text()

            return {
                "status": "found",
                "selector": selector,
                "text": content,
                "box": box,
            }
        except Exception as e:
            logger.error(f"Element lookup failed: {e}")
            return {"status": "error", "message": str(e)}

    async def click(self, selector: str) -> Dict[str, Any]:
        """Click element"""
        try:
            if not self.page:
                raise RuntimeError("Browser not initialized")

            await self.page.click(selector)

            return {"status": "success", "action": "clicked", "selector": selector}
        except Exception as e:
            logger.error(f"Click failed: {e}")
            return {"status": "error", "message": str(e)}

    async def fill(self, selector: str, text: str) -> Dict[str, Any]:
        """Fill form field"""
        try:
            if not self.page:
                raise RuntimeError("Browser not initialized")

            await self.page.fill(selector, text)

            return {"status": "success", "action": "filled", "selector": selector, "text": text}
        except Exception as e:
            logger.error(f"Fill failed: {e}")
            return {"status": "error", "message": str(e)}

    async def select(self, selector: str, value: str) -> Dict[str, Any]:
        """Select dropdown option"""
        try:
            if not self.page:
                raise RuntimeError("Browser not initialized")

            await self.page.select_option(selector, value)

            return {"status": "success", "action": "selected", "selector": selector, "value": value}
        except Exception as e:
            logger.error(f"Select failed: {e}")
            return {"status": "error", "message": str(e)}

    async def screenshot(self, output_path: Optional[str] = None) -> Dict[str, Any]:
        """Take screenshot"""
        try:
            if not self.page:
                raise RuntimeError("Browser not initialized")

            path = output_path or "/tmp/screenshot.png"
            await self.page.screenshot(path=path)

            return {"status": "success", "path": path}
        except Exception as e:
            logger.error(f"Screenshot failed: {e}")
            return {"status": "error", "message": str(e)}

    async def execute_script(self, script: str) -> Dict[str, Any]:
        """Execute JavaScript"""
        try:
            if not self.page:
                raise RuntimeError("Browser not initialized")

            result = await self.page.evaluate(script)

            return {"status": "success", "result": result}
        except Exception as e:
            logger.error(f"Script execution failed: {e}")
            return {"status": "error", "message": str(e)}

    async def wait_for_element(self, selector: str, timeout: int = 30000) -> Dict[str, Any]:
        """Wait for element"""
        try:
            if not self.page:
                raise RuntimeError("Browser not initialized")

            await self.page.wait_for_selector(selector, timeout=timeout)

            return {"status": "success", "selector": selector}
        except Exception as e:
            logger.error(f"Wait failed: {e}")
            return {"status": "error", "message": str(e)}

    async def get_text(self, selector: str) -> str:
        """Get element text"""
        try:
            if not self.page:
                raise RuntimeError("Browser not initialized")

            return await self.page.inner_text(selector)
        except Exception as e:
            logger.error(f"Get text failed: {e}")
            return ""

    async def get_attribute(self, selector: str, attribute: str) -> str:
        """Get element attribute"""
        try:
            if not self.page:
                raise RuntimeError("Browser not initialized")

            return await self.page.get_attribute(selector, attribute)
        except Exception as e:
            logger.error(f"Get attribute failed: {e}")
            return ""

    async def close(self) -> None:
        """Close browser"""
        try:
            if self.page:
                await self.page.close()

            if self.browser:
                await self.browser.close()

            if self.playwright:
                await self.playwright.stop()

            logger.info("Browser closed")
        except Exception as e:
            logger.error(f"Close failed: {e}")


class BrowserToolFactory:
    """Factory for creating browser automation tools"""

    @staticmethod
    def create(tool_type: str = "playwright", **kwargs) -> BrowserAutomationTool:
        """
        Create a browser automation tool

        Args:
            tool_type: playwright, selenium, etc.
            **kwargs: Tool-specific parameters

        Returns:
            BrowserAutomationTool instance
        """
        if tool_type == "playwright":
            return PlaywrightBrowserTool(**kwargs)
        else:
            raise ValueError(f"Unknown browser tool type: {tool_type}")
