"""Configuration Django de l'application « Gestion de l'usine ».

Les valeurs sensibles sont lues dans le fichier .env à la racine du projet (voir .env.example).
"""
import os
from pathlib import Path
from urllib.parse import unquote, urlparse

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _booleen(nom: str, defaut: str = "false") -> bool:
    return os.environ.get(nom, defaut).strip().lower() in ("1", "true", "oui", "yes")


def _base_depuis_url(url: str) -> dict:
    """postgresql://utilisateur:motdepasse@hote:port/base?sslmode=require -> réglages Django."""
    morceaux = urlparse(url)
    if morceaux.scheme not in ("postgres", "postgresql"):
        raise ValueError("DATABASE_URL doit commencer par postgresql://")
    options = {}
    for paire in filter(None, morceaux.query.split("&")):
        cle, _, valeur = paire.partition("=")
        options[cle] = valeur
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": unquote(morceaux.path.lstrip("/")),
        "USER": unquote(morceaux.username or ""),
        "PASSWORD": unquote(morceaux.password or ""),
        "HOST": morceaux.hostname or "localhost",
        "PORT": str(morceaux.port or 5432),
        "OPTIONS": options,
        "CONN_MAX_AGE": 60,
        "CONN_HEALTH_CHECKS": True,
    }


SECRET_KEY = os.environ.get("SECRET_KEY", "")
DEBUG = _booleen("DEBUG")
if not SECRET_KEY:
    if not DEBUG:
        raise RuntimeError("SECRET_KEY doit être renseignée dans le fichier .env.")
    SECRET_KEY = "cle-de-developpement-uniquement"

ALLOWED_HOSTS = [h.strip() for h in os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]
CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",") if o.strip()
]
# Render fournit automatiquement l'adresse publique du service.
if os.environ.get("RENDER_EXTERNAL_HOSTNAME"):
    ALLOWED_HOSTS.append(os.environ["RENDER_EXTERNAL_HOSTNAME"])
    CSRF_TRUSTED_ORIGINS.append(f"https://{os.environ['RENDER_EXTERNAL_HOSTNAME']}")

# Ni django.contrib.auth ni django.contrib.admin : les comptes sont ceux de la table « utilisateur »
# du script SQL, et aucune table supplémentaire n'est créée dans la base.
INSTALLED_APPS = [
    "django.contrib.staticfiles",
    "django.contrib.messages",
    "usine",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "usine.middleware.AuthentificationMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.messages.context_processors.messages",
                "usine.context_processors.application",
            ],
            "builtins": ["usine.templatetags.usine"],
        },
    },
]

DATABASES = {
    "default": _base_depuis_url(
        os.environ.get("DATABASE_URL", "postgresql://postgres@localhost:5432/gestion_usine")
    )
}
DEFAULT_AUTO_FIELD = "django.db.models.AutoField"

# Session dans un cookie signé : aucune table django_session n'est nécessaire.
SESSION_ENGINE = "django.contrib.sessions.backends.signed_cookies"
SESSION_COOKIE_AGE = 8 * 60 * 60  # une journée de travail
SESSION_COOKIE_HTTPONLY = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
MESSAGE_STORAGE = "django.contrib.messages.storage.cookie.CookieStorage"

# Verrouillage après 5 échecs de connexion (compteurs en mémoire)
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Abidjan"
USE_I18N = True
USE_TZ = False  # les colonnes TIMESTAMP du script SQL sont sans fuseau horaire

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
if DEBUG:
    STORAGES["staticfiles"] = {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}

if not DEBUG:
    SESSION_COOKIE_SECURE = _booleen("COOKIES_SECURISES", "true")
    CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE
    # Derrière le proxy HTTPS de l'hébergeur (Render, Railway...)
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

TEST_RUNNER = "usine.tests.runner.RunnerAvecSchema"

# Réglages propres à l'application
SEUIL_STOCK_FAIBLE = int(os.environ.get("SEUIL_STOCK_FAIBLE", "5"))
MODE_DEMO = _booleen("MODE_DEMO")
SCRIPT_SQL = BASE_DIR / "database" / "gestion_usine_supabase.sql"
