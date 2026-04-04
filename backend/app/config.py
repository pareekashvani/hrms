import os
from functools import lru_cache


class Settings:
    secret_key: str = os.getenv("SECRET_KEY", "change-me-in-production-use-openssl-rand-hex-32")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 days
    default_admin_email: str = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@gmail.com")
    default_admin_password: str = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")


@lru_cache
def get_settings() -> Settings:
    return Settings()
