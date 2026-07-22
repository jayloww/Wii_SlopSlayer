"""Tiny static server for the kiosk that disables HTTP caching.

The kiosk launches Chrome with a persistent --user-data-dir profile so the
highscore/leaderboard in localStorage survive restarts. A side effect of a
persistent profile is a persistent HTTP cache, which made Chrome serve stale
game.js / game.html after the code was updated. Sending "Cache-Control:
no-store" on every response forces the browser to re-fetch the current files
on each launch, so newly pulled changes always take effect.

Usage: python serve.py [port]   (default 8000)
"""
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    HTTPServer(("127.0.0.1", port), NoCacheHandler).serve_forever()
