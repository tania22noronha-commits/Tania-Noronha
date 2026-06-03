from fastapi import FastAPI, APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import List
import asyncio
import json

from models import (
    User, UserCreate, UserLogin, World, WorldCreate, Agent, Event,
    Relationship, Business, SimulationStats, Story, NewspaperArticle, Policy, Government
)
from auth import hash_password, verify_password, create_token, get_current_user
from agent_generator import generate_agents
from simulation_engine import SimulationEngine, trigger_god_mode_event
from ai_engine import generate_story_summary, generate_newspaper_article

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

simulation_tasks = {}

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pw = hash_password(user_data.password)
    user = User(email=user_data.email, username=user_data.username)
    user_dict = user.model_dump()
    user_dict['password'] = hashed_pw
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    token = create_token(user.id)
    
    return {"token": token, "user": user}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc or not verify_password(credentials.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user_doc['id'])
    user = User(**user_doc)
    
    return {"token": token, "user": user}

@api_router.post("/worlds", response_model=World)
async def create_world(world_data: WorldCreate, user_id: str = Depends(get_current_user)):
    world = World(user_id=user_id, name=world_data.name)
    world_dict = world.model_dump()
    world_dict['created_at'] = world_dict['created_at'].isoformat()
    world_dict['simulated_date'] = world_dict['simulated_date'].isoformat()
    
    await db.worlds.insert_one(world_dict)
    
    agents = generate_agents(world.id, count=100)
    agent_dicts = []
    for agent in agents:
        agent_dict = agent.model_dump()
        agent_dict['created_at'] = agent_dict['created_at'].isoformat()
        agent_dicts.append(agent_dict)
    
    await db.agents.insert_many(agent_dicts)
    
    await db.worlds.update_one(
        {"id": world.id},
        {"$set": {"population": 100}}
    )
    
    government = Government(world_id=world.id)
    await db.governments.insert_one(government.model_dump())
    
    return world

@api_router.get("/worlds", response_model=List[World])
async def get_worlds(user_id: str = Depends(get_current_user)):
    worlds = await db.worlds.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    for world in worlds:
        if isinstance(world.get('created_at'), str):
            world['created_at'] = datetime.fromisoformat(world['created_at'])
        if isinstance(world.get('simulated_date'), str):
            world['simulated_date'] = datetime.fromisoformat(world['simulated_date'])
    return worlds

@api_router.get("/worlds/{world_id}")
async def get_world(world_id: str, user_id: str = Depends(get_current_user)):
    world = await db.worlds.find_one({"id": world_id, "user_id": user_id}, {"_id": 0})
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    
    if isinstance(world.get('created_at'), str):
        world['created_at'] = datetime.fromisoformat(world['created_at'])
    if isinstance(world.get('simulated_date'), str):
        world['simulated_date'] = datetime.fromisoformat(world['simulated_date'])
    
    return world

@api_router.delete("/worlds/{world_id}")
async def delete_world(world_id: str, user_id: str = Depends(get_current_user)):
    world = await db.worlds.find_one({"id": world_id, "user_id": user_id})
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    
    await db.worlds.delete_one({"id": world_id})
    await db.agents.delete_many({"world_id": world_id})
    await db.events.delete_many({"world_id": world_id})
    await db.relationships.delete_many({"world_id": world_id})
    await db.businesses.delete_many({"world_id": world_id})
    await db.stories.delete_many({"world_id": world_id})
    await db.newspapers.delete_many({"world_id": world_id})
    await db.governments.delete_many({"world_id": world_id})
    
    if world_id in simulation_tasks:
        simulation_tasks[world_id].cancel()
        del simulation_tasks[world_id]
    
    return {"message": "World deleted"}

@api_router.get("/worlds/{world_id}/stats", response_model=SimulationStats)
async def get_world_stats(world_id: str, user_id: str = Depends(get_current_user)):
    world = await db.worlds.find_one({"id": world_id, "user_id": user_id}, {"_id": 0})
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    
    # Optimized: Only fetch required fields for stats calculation
    agents = await db.agents.find(
        {"world_id": world_id}, 
        {"_id": 0, "resources.wealth": 1, "resources.income": 1, "emotional_state.happiness": 1, "occupation": 1}
    ).to_list(1000)
    
    # Optimized: Use count_documents instead of fetching all data
    business_count = await db.businesses.count_documents({"world_id": world_id})
    relationship_count = await db.relationships.count_documents({"world_id": world_id})
    government = await db.governments.find_one({"world_id": world_id}, {"_id": 0})
    
    total_wealth = sum(a.get('resources', {}).get('wealth', 0) for a in agents)
    avg_income = sum(a.get('resources', {}).get('income', 0) for a in agents) / len(agents) if agents else 0
    avg_happiness = sum(a.get('emotional_state', {}).get('happiness', 70) for a in agents) / len(agents) if agents else 70
    
    employed = len([a for a in agents if a.get('occupation') != 'Unemployed'])
    employment_rate = (employed / len(agents) * 100) if agents else 85
    
    mayor_name = None
    if government and government.get('mayor_id'):
        # Optimized: Only fetch name field
        mayor = await db.agents.find_one({"id": government['mayor_id']}, {"_id": 0, "name": 1})
        if mayor:
            mayor_name = mayor['name']
    
    return SimulationStats(
        population=len(agents),
        births=0,
        deaths=0,
        total_wealth=total_wealth,
        average_income=avg_income,
        business_count=business_count,
        employment_rate=employment_rate,
        average_happiness=int(avg_happiness),
        relationship_count=relationship_count,
        crime_rate=world.get('crime_rate', 5.0),
        trust_index=70,
        mayor_name=mayor_name,
        approval_rating=government.get('approval_rating', 50) if government else 50
    )

@api_router.get("/worlds/{world_id}/agents", response_model=List[Agent])
async def get_agents(world_id: str, user_id: str = Depends(get_current_user), limit: int = 100):
    world = await db.worlds.find_one({"id": world_id, "user_id": user_id})
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    
    agents = await db.agents.find({"world_id": world_id}, {"_id": 0}).limit(limit).to_list(limit)
    
    for agent in agents:
        if isinstance(agent.get('created_at'), str):
            agent['created_at'] = datetime.fromisoformat(agent['created_at'])
    
    return agents

@api_router.get("/worlds/{world_id}/agents/{agent_id}")
async def get_agent(world_id: str, agent_id: str, user_id: str = Depends(get_current_user)):
    world = await db.worlds.find_one({"id": world_id, "user_id": user_id})
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    
    agent = await db.agents.find_one({"id": agent_id, "world_id": world_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    if isinstance(agent.get('created_at'), str):
        agent['created_at'] = datetime.fromisoformat(agent['created_at'])
    
    relationships = await db.relationships.find({
        "world_id": world_id,
        "$or": [{"agent1_id": agent_id}, {"agent2_id": agent_id}]
    }, {"_id": 0}).to_list(100)
    
    # Optimized: Batch fetch all agent names instead of N+1 queries
    agent_ids = []
    for rel in relationships:
        other_id = rel['agent2_id'] if rel['agent1_id'] == agent_id else rel['agent1_id']
        agent_ids.append(other_id)
    
    if agent_ids:
        agents_list = await db.agents.find(
            {"id": {"$in": agent_ids}}, 
            {"_id": 0, "id": 1, "name": 1}
        ).to_list(len(agent_ids))
        agents_map = {a['id']: a['name'] for a in agents_list}
        
        for rel in relationships:
            other_id = rel['agent2_id'] if rel['agent1_id'] == agent_id else rel['agent1_id']
            rel['other_agent_name'] = agents_map.get(other_id, "Unknown")
    
    agent['relationships'] = relationships
    
    return agent

@api_router.get("/worlds/{world_id}/events")
async def get_events(world_id: str, user_id: str = Depends(get_current_user), limit: int = 50):
    world = await db.worlds.find_one({"id": world_id, "user_id": user_id})
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    
    events = await db.events.find({"world_id": world_id}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    
    for event in events:
        if isinstance(event.get('timestamp'), str):
            event['timestamp'] = datetime.fromisoformat(event['timestamp'])
    
    return events

@api_router.get("/worlds/{world_id}/relationships")
async def get_relationships(world_id: str, user_id: str = Depends(get_current_user)):
    world = await db.worlds.find_one({"id": world_id, "user_id": user_id})
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    
    relationships = await db.relationships.find({"world_id": world_id}, {"_id": 0}).to_list(500)
    
    for rel in relationships:
        if isinstance(rel.get('created_at'), str):
            rel['created_at'] = datetime.fromisoformat(rel['created_at'])
    
    # Optimized: Batch fetch all agent names instead of N+1 queries
    agent_ids = []
    for rel in relationships:
        agent_ids.extend([rel['agent1_id'], rel['agent2_id']])
    
    if agent_ids:
        unique_agent_ids = list(set(agent_ids))
        agents_list = await db.agents.find(
            {"id": {"$in": unique_agent_ids}}, 
            {"_id": 0, "id": 1, "name": 1}
        ).to_list(len(unique_agent_ids))
        agents_map = {a['id']: a['name'] for a in agents_list}
        
        for rel in relationships:
            rel['agent1_name'] = agents_map.get(rel['agent1_id'], "Unknown")
            rel['agent2_name'] = agents_map.get(rel['agent2_id'], "Unknown")
    
    return relationships

@api_router.get("/worlds/{world_id}/businesses")
async def get_businesses(world_id: str, user_id: str = Depends(get_current_user)):
    world = await db.worlds.find_one({"id": world_id, "user_id": user_id})
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    
    businesses = await db.businesses.find({"world_id": world_id}, {"_id": 0}).to_list(500)
    
    for business in businesses:
        if isinstance(business.get('created_at'), str):
            business['created_at'] = datetime.fromisoformat(business['created_at'])
    
    # Optimized: Batch fetch all owner names instead of N+1 queries
    owner_ids = [b['owner_id'] for b in businesses]
    
    if owner_ids:
        owners_list = await db.agents.find(
            {"id": {"$in": owner_ids}}, 
            {"_id": 0, "id": 1, "name": 1}
        ).to_list(len(owner_ids))
        owners_map = {a['id']: a['name'] for a in owners_list}
        
        for business in businesses:
            business['owner_name'] = owners_map.get(business['owner_id'], "Unknown")
    
    return businesses

@api_router.post("/worlds/{world_id}/simulation/start")
async def start_simulation(world_id: str, background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user)):
    world = await db.worlds.find_one({"id": world_id, "user_id": user_id})
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    
    await db.worlds.update_one(
        {"id": world_id},
        {"$set": {"settings.is_paused": False}}
    )
    
    if world_id not in simulation_tasks:
        task = asyncio.create_task(run_simulation_loop(world_id))
        simulation_tasks[world_id] = task
    
    return {"message": "Simulation started"}

@api_router.post("/worlds/{world_id}/simulation/pause")
async def pause_simulation(world_id: str, user_id: str = Depends(get_current_user)):
    world = await db.worlds.find_one({"id": world_id, "user_id": user_id})
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    
    await db.worlds.update_one(
        {"id": world_id},
        {"$set": {"settings.is_paused": True}}
    )
    
    return {"message": "Simulation paused"}

@api_router.post("/worlds/{world_id}/simulation/speed")
async def set_simulation_speed(world_id: str, speed: float, user_id: str = Depends(get_current_user)):
    world = await db.worlds.find_one({"id": world_id, "user_id": user_id})
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    
    await db.worlds.update_one(
        {"id": world_id},
        {"$set": {"settings.simulation_speed": speed}}
    )
    
    return {"message": f"Speed set to {speed}x"}

@api_router.post("/worlds/{world_id}/god-mode/{event_type}")
async def trigger_god_event(world_id: str, event_type: str, user_id: str = Depends(get_current_user)):
    world = await db.worlds.find_one({"id": world_id, "user_id": user_id})
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    
    result = await trigger_god_mode_event(db, world_id, event_type)
    return result

@api_router.get("/worlds/{world_id}/stories")
async def get_stories(world_id: str, user_id: str = Depends(get_current_user)):
    world = await db.worlds.find_one({"id": world_id, "user_id": user_id})
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    
    stories = await db.stories.find({"world_id": world_id}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    
    for story in stories:
        if isinstance(story.get('created_at'), str):
            story['created_at'] = datetime.fromisoformat(story['created_at'])
    
    return stories

@api_router.get("/worlds/{world_id}/newspaper")
async def get_newspaper(world_id: str, user_id: str = Depends(get_current_user)):
    world = await db.worlds.find_one({"id": world_id, "user_id": user_id})
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    
    articles = await db.newspapers.find({"world_id": world_id}, {"_id": 0}).sort("published_at", -1).limit(10).to_list(10)
    
    for article in articles:
        if isinstance(article.get('published_at'), str):
            article['published_at'] = datetime.fromisoformat(article['published_at'])
    
    return articles

@api_router.get("/worlds/{world_id}/analytics")
async def get_analytics(world_id: str, user_id: str = Depends(get_current_user)):
    world = await db.worlds.find_one({"id": world_id, "user_id": user_id})
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    
    # Optimized: Only fetch required fields for analytics
    agents = await db.agents.find(
        {"world_id": world_id}, 
        {"_id": 0, "resources.wealth": 1, "occupation": 1, "emotional_state.happiness": 1}
    ).to_list(1000)
    
    wealth_distribution = [a.get('resources', {}).get('wealth', 0) for a in agents]
    wealth_ranges = {
        "0-50k": len([w for w in wealth_distribution if w < 50000]),
        "50k-100k": len([w for w in wealth_distribution if 50000 <= w < 100000]),
        "100k-200k": len([w for w in wealth_distribution if 100000 <= w < 200000]),
        "200k+": len([w for w in wealth_distribution if w >= 200000])
    }
    
    occupations = {}
    for agent in agents:
        occ = agent.get('occupation', 'Unknown')
        occupations[occ] = occupations.get(occ, 0) + 1
    
    return {
        "wealth_distribution": wealth_ranges,
        "occupations": occupations,
        "total_population": len(agents),
        "average_happiness": sum(a.get('emotional_state', {}).get('happiness', 70) for a in agents) / len(agents) if agents else 70
    }

async def run_simulation_loop(world_id: str):
    """Background task to run simulation continuously"""
    engine = SimulationEngine(db, world_id)
    
    while True:
        try:
            await engine.run_simulation_cycle()
            await asyncio.sleep(5)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Simulation error for world {world_id}: {e}")
            await asyncio.sleep(10)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    for task in simulation_tasks.values():
        task.cancel()
