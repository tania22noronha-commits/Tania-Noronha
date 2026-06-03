from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
import uuid

class UserCreate(BaseModel):
    email: str
    password: str
    username: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    username: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PersonalityTraits(BaseModel):
    ambition: int = 50
    kindness: int = 50
    intelligence: int = 50
    creativity: int = 50
    sociability: int = 50
    risk_tolerance: int = 50
    discipline: int = 50
    honesty: int = 50

class EmotionalState(BaseModel):
    happiness: int = 70
    stress: int = 30
    confidence: int = 60
    motivation: int = 70

class Resources(BaseModel):
    wealth: float = 50000.0
    income: float = 0.0
    assets: List[str] = Field(default_factory=list)

class Goal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    progress: int = 0
    completed: bool = False

class Memory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    event_type: str
    description: str
    impact: int = 0

class Agent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    world_id: str
    name: str
    age: int
    gender: str
    occupation: str
    personality: PersonalityTraits = Field(default_factory=PersonalityTraits)
    emotional_state: EmotionalState = Field(default_factory=EmotionalState)
    resources: Resources = Field(default_factory=Resources)
    goals: List[Goal] = Field(default_factory=list)
    memories: List[Memory] = Field(default_factory=list)
    location: Dict[str, Any] = Field(default_factory=lambda: {"district": "Residential", "building": "Home"})
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Relationship(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    world_id: str
    agent1_id: str
    agent2_id: str
    relationship_type: str
    strength: int = 50
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Business(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    world_id: str
    name: str
    business_type: str
    owner_id: str
    revenue: float = 0.0
    profit: float = 0.0
    employees: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    world_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    event_type: str
    description: str
    involved_agents: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class Policy(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    world_id: str
    name: str
    description: str
    effects: Dict[str, Any] = Field(default_factory=dict)
    enacted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Government(BaseModel):
    model_config = ConfigDict(extra="ignore")
    world_id: str
    mayor_id: Optional[str] = None
    approval_rating: int = 50
    policies: List[str] = Field(default_factory=list)

class Story(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    world_id: str
    title: str
    story_type: str
    summary: str
    involved_agents: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NewspaperArticle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    world_id: str
    headline: str
    section: str
    content: str
    published_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WorldSettings(BaseModel):
    simulation_speed: float = 1.0
    is_paused: bool = False

class World(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    simulated_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    population: int = 0
    total_wealth: float = 0.0
    average_happiness: int = 70
    crime_rate: float = 5.0
    employment_rate: float = 85.0
    settings: WorldSettings = Field(default_factory=WorldSettings)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WorldCreate(BaseModel):
    name: str

class SimulationStats(BaseModel):
    population: int
    births: int = 0
    deaths: int = 0
    total_wealth: float
    average_income: float
    business_count: int
    employment_rate: float
    average_happiness: int
    relationship_count: int
    crime_rate: float
    trust_index: int
    mayor_name: Optional[str] = None
    approval_rating: int = 50
