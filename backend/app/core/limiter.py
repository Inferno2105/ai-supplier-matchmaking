"""
Shared rate limiter instance, in a module of its own so route files can
import it without a circular import with main.py (which also needs it to
attach to app.state and register the 429 exception handler).
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
