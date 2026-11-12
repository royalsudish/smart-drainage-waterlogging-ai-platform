import socket
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import urllib3.util.connection as urllib3_conn
from backend.config.settings import APP_USER_AGENT, REQUEST_TIMEOUT_SECONDS

# Force IPv4 resolution to prevent dual-stack IPv6 TLS handshake timeouts
def _allowed_gai_family():
    return socket.AF_INET

urllib3_conn.allowed_gai_family = _allowed_gai_family

def session():
    s = requests.Session()
    s.headers.update({
        "User-Agent": APP_USER_AGENT,
        "Accept": "application/json,*/*"
    })
    retries = Retry(
        total=3,
        backoff_factor=0.3,
        status_forcelist=[429, 500, 502, 503, 504],
        raise_on_status=False
    )
    adapter = HTTPAdapter(max_retries=retries)
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    return s

def get_json(url, params=None, timeout=None, headers=None):
    s = session()
    if headers:
        s.headers.update(headers)
    effective_timeout = timeout or REQUEST_TIMEOUT_SECONDS
    r = s.get(url, params=params, timeout=effective_timeout)
    r.raise_for_status()
    return r.json()

def post_form_json(url, data=None, timeout=None, headers=None):
    s = session()
    if headers:
        s.headers.update(headers)
    effective_timeout = timeout or REQUEST_TIMEOUT_SECONDS
    r = s.post(url, data=data, timeout=effective_timeout)
    r.raise_for_status()
    return r.json()
