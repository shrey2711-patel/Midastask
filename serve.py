#!/usr/bin/env python3
"""
OfficeTask / Midas Task Management
Lightweight Local HTTP Development Server
"""

import http.server
import socketserver
import os
import sys
import webbrowser

PORT = 8000

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable browser cache for seamless prototype updates
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

class ThreadingSimpleServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    allow_reuse_address = True
    daemon_threads = True

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with ThreadingSimpleServer(("", PORT), CustomHandler) as httpd:
        url = f"http://localhost:{PORT}/login.html"
        print("=" * 60)
        print(f"  Midas Task Management UI/UX Prototype Server")
        print(f"  Local URL: {url}")
        print(f"  Press Ctrl+C to stop the server.")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            sys.exit(0)

if __name__ == '__main__':
    main()
