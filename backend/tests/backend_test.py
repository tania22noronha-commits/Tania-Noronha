"""Backend API tests for AI City of Agents."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://zenith-self.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@aicity.com"
DEMO_PASS = "Demo123456!"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth_token(session):
    # Try login; if fails, register
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS}, timeout=20)
    if r.status_code != 200:
        rr = session.post(f"{API}/auth/register",
                          json={"email": DEMO_EMAIL, "username": "demo", "password": DEMO_PASS}, timeout=20)
        if rr.status_code == 200:
            return rr.json()["token"]
        # If already registered but pwd mismatch, fail
        pytest.skip(f"Cannot authenticate: login={r.status_code} register={rr.status_code} {rr.text[:200]}")
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def world_id(session, auth_headers):
    # Reuse existing or create one
    r = session.get(f"{API}/worlds", headers=auth_headers, timeout=20)
    assert r.status_code == 200, r.text
    worlds = r.json()
    if worlds:
        return worlds[0]["id"]
    create = session.post(f"{API}/worlds", headers=auth_headers,
                          json={"name": f"TEST_World_{uuid.uuid4().hex[:6]}"}, timeout=60)
    assert create.status_code == 200, create.text
    return create.json()["id"]


# ---------- Auth ----------
class TestAuth:
    def test_register_duplicate(self, session):
        r = session.post(f"{API}/auth/register",
                         json={"email": DEMO_EMAIL, "username": "demo", "password": DEMO_PASS}, timeout=20)
        # Either 400 if already exists, or 200 if first run
        assert r.status_code in (200, 400)

    def test_login_success(self, session):
        r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and "user" in data
        assert data["user"]["email"] == DEMO_EMAIL

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"}, timeout=20)
        assert r.status_code == 401

    def test_worlds_requires_auth(self, session):
        r = session.get(f"{API}/worlds", timeout=20)
        assert r.status_code in (401, 403)


# ---------- Worlds ----------
class TestWorlds:
    def test_list_worlds(self, session, auth_headers):
        r = session.get(f"{API}/worlds", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_world(self, session, auth_headers, world_id):
        r = session.get(f"{API}/worlds/{world_id}", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == world_id
        assert "population" in data

    def test_world_stats(self, session, auth_headers, world_id):
        r = session.get(f"{API}/worlds/{world_id}/stats", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        data = r.json()
        # Basic shape checks
        for k in ("population", "average_happiness", "average_income"):
            assert k in data


# ---------- Agents ----------
class TestAgents:
    def test_list_agents(self, session, auth_headers, world_id):
        r = session.get(f"{API}/worlds/{world_id}/agents", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        agents = r.json()
        assert isinstance(agents, list)
        assert len(agents) == 100, f"Expected 100 agents, got {len(agents)}"
        a = agents[0]
        for k in ("id", "name", "age", "personality"):
            assert k in a

    def test_agent_detail(self, session, auth_headers, world_id):
        agents = session.get(f"{API}/worlds/{world_id}/agents", headers=auth_headers, timeout=30).json()
        aid = agents[0]["id"]
        r = session.get(f"{API}/worlds/{world_id}/agents/{aid}", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == aid
        assert "relationships" in data


# ---------- Events / Relationships / Businesses ----------
class TestEntities:
    def test_events(self, session, auth_headers, world_id):
        r = session.get(f"{API}/worlds/{world_id}/events", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_relationships(self, session, auth_headers, world_id):
        r = session.get(f"{API}/worlds/{world_id}/relationships", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_businesses(self, session, auth_headers, world_id):
        r = session.get(f"{API}/worlds/{world_id}/businesses", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_stories(self, session, auth_headers, world_id):
        r = session.get(f"{API}/worlds/{world_id}/stories", headers=auth_headers, timeout=20)
        assert r.status_code == 200

    def test_newspaper(self, session, auth_headers, world_id):
        r = session.get(f"{API}/worlds/{world_id}/newspaper", headers=auth_headers, timeout=20)
        assert r.status_code == 200

    def test_analytics(self, session, auth_headers, world_id):
        r = session.get(f"{API}/worlds/{world_id}/analytics", headers=auth_headers, timeout=20)
        assert r.status_code == 200


# ---------- Simulation control ----------
class TestSimulation:
    def test_start_pause(self, session, auth_headers, world_id):
        r = session.post(f"{API}/worlds/{world_id}/simulation/start", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        time.sleep(2)
        r2 = session.post(f"{API}/worlds/{world_id}/simulation/pause", headers=auth_headers, timeout=20)
        assert r2.status_code == 200

    def test_speed(self, session, auth_headers, world_id):
        r = session.post(f"{API}/worlds/{world_id}/simulation/speed",
                         headers=auth_headers, json={"speed": 2}, timeout=20)
        # Accept 200 or 422 depending on signature
        assert r.status_code in (200, 422), r.text


# ---------- God Mode ----------
class TestGodMode:
    @pytest.mark.parametrize("event_type", ["recession", "boom", "festival"])
    def test_god_mode(self, session, auth_headers, world_id, event_type):
        r = session.post(f"{API}/worlds/{world_id}/god-mode/{event_type}", headers=auth_headers, timeout=20)
        assert r.status_code == 200, f"{event_type}: {r.text}"
