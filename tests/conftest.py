import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app  # noqa: E402

LOGIN, PIN = "Тест_ученик", "2468"


@pytest.fixture
def app(tmp_path):
    return create_app({"DATABASE": str(tmp_path / "test.db"), "TESTING": True})


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def logged(client):
    client.post("/register", data={"login": LOGIN, "pin": PIN, "pin2": PIN, "avatar": "🤖"})
    return client
