import random  # Note: Using random for simulation/game logic, not security-critical operations
from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
from models import Agent, Event, Relationship, Business, Memory, Goal
import asyncio
from ai_engine import generate_agent_decision

class SimulationEngine:
    def __init__(self, db, world_id: str):
        self.db = db
        self.world_id = world_id
        self.cycle_count = 0
    
    async def run_simulation_cycle(self):
        """Run one simulation cycle"""
        self.cycle_count += 1
        
        world = await self.db.worlds.find_one({"id": self.world_id}, {"_id": 0})
        if not world or world.get("settings", {}).get("is_paused", False):
            return
        
        agents = await self.db.agents.find({"world_id": self.world_id}, {"_id": 0}).to_list(1000)
        
        if self.cycle_count % 5 == 0:
            await self.process_agent_decisions(agents, world)
        
        if self.cycle_count % 10 == 0:
            await self.process_relationships(agents)
        
        if self.cycle_count % 15 == 0:
            await self.process_economy(agents)
        
        await self.update_world_stats(agents)
    
    async def process_agent_decisions(self, agents: List[Dict], world: Dict):
        """Process decisions for a sample of agents"""
        sample_size = min(10, len(agents))
        sample_agents = random.sample(agents, sample_size)
        
        for agent in sample_agents:
            world_context = {
                "population": world.get("population", 100),
                "average_happiness": world.get("average_happiness", 70),
                "employment_rate": world.get("employment_rate", 85)
            }
            
            try:
                decision = await generate_agent_decision(agent, world_context)
                
                event = Event(
                    world_id=self.world_id,
                    event_type="agent_action",
                    description=f"{agent['name']}: {decision['action']}",
                    involved_agents=[agent['id']]
                )
                
                event_dict = event.model_dump()
                event_dict['timestamp'] = event_dict['timestamp'].isoformat()
                await self.db.events.insert_one(event_dict)
                
                memory = Memory(
                    event_type="action",
                    description=decision['action'],
                    impact=random.randint(1, 5)
                )
                
                await self.db.agents.update_one(
                    {"id": agent['id']},
                    {"$push": {"memories": memory.model_dump()}}
                )
                
            except Exception as e:
                print(f"Error processing agent decision: {e}")
    
    async def process_relationships(self, agents: List[Dict]):
        """Create and update relationships"""
        if len(agents) < 2:
            return
        
        if random.random() < 0.3:
            agent1 = random.choice(agents)
            agent2 = random.choice([a for a in agents if a['id'] != agent1['id']])
            
            existing = await self.db.relationships.find_one({
                "world_id": self.world_id,
                "$or": [
                    {"agent1_id": agent1['id'], "agent2_id": agent2['id']},
                    {"agent1_id": agent2['id'], "agent2_id": agent1['id']}
                ]
            })
            
            if not existing:
                rel_type = random.choice(["friendship", "professional", "romantic", "rivalry"])
                relationship = Relationship(
                    world_id=self.world_id,
                    agent1_id=agent1['id'],
                    agent2_id=agent2['id'],
                    relationship_type=rel_type,
                    strength=random.randint(30, 70)
                )
                
                rel_dict = relationship.model_dump()
                rel_dict['created_at'] = rel_dict['created_at'].isoformat()
                await self.db.relationships.insert_one(rel_dict)
                
                event = Event(
                    world_id=self.world_id,
                    event_type="relationship",
                    description=f"{agent1['name']} and {agent2['name']} formed a {rel_type}",
                    involved_agents=[agent1['id'], agent2['id']]
                )
                event_dict = event.model_dump()
                event_dict['timestamp'] = event_dict['timestamp'].isoformat()
                await self.db.events.insert_one(event_dict)
    
    async def process_economy(self, agents: List[Dict]):
        """Process economic activities"""
        high_ambition_agents = [a for a in agents if a.get('personality', {}).get('ambition', 50) > 75]
        
        if high_ambition_agents and random.random() < 0.2:
            agent = random.choice(high_ambition_agents)
            
            if agent.get('resources', {}).get('wealth', 0) > 50000:
                business_types = ["Restaurant", "Tech Startup", "Retail Shop", "Consulting Firm", "Media Company"]
                business_name = f"{agent['name'].split()[0]}'s {random.choice(business_types)}"
                
                business = Business(
                    world_id=self.world_id,
                    name=business_name,
                    business_type=random.choice(business_types),
                    owner_id=agent['id'],
                    revenue=random.uniform(10000, 100000),
                    profit=random.uniform(5000, 50000)
                )
                
                business_dict = business.model_dump()
                business_dict['created_at'] = business_dict['created_at'].isoformat()
                await self.db.businesses.insert_one(business_dict)
                
                event = Event(
                    world_id=self.world_id,
                    event_type="business",
                    description=f"{agent['name']} started {business_name}",
                    involved_agents=[agent['id']]
                )
                event_dict = event.model_dump()
                event_dict['timestamp'] = event_dict['timestamp'].isoformat()
                await self.db.events.insert_one(event_dict)
    
    async def update_world_stats(self, agents: List[Dict]):
        """Update world statistics"""
        if not agents:
            return
        
        total_wealth = sum(a.get('resources', {}).get('wealth', 0) for a in agents)
        avg_happiness = sum(a.get('emotional_state', {}).get('happiness', 70) for a in agents) / len(agents)
        
        businesses_count = await self.db.businesses.count_documents({"world_id": self.world_id})
        relationships_count = await self.db.relationships.count_documents({"world_id": self.world_id})
        
        await self.db.worlds.update_one(
            {"id": self.world_id},
            {
                "$set": {
                    "population": len(agents),
                    "total_wealth": total_wealth,
                    "average_happiness": int(avg_happiness)
                }
            }
        )

async def trigger_god_mode_event(db, world_id: str, event_type: str) -> Dict[str, str]:
    """Trigger a god mode event"""
    agents = await db.agents.find({"world_id": world_id}, {"_id": 0}).to_list(1000)
    
    event_effects = {
        "recession": "Economic recession hits the city. Wealth decreases by 20%.",
        "boom": "Economic boom! Wealth increases by 30%.",
        "pandemic": "Pandemic outbreak. Happiness decreases, stress increases.",
        "festival": "City-wide festival! Happiness increases significantly.",
        "tech_breakthrough": "Major tech breakthrough. Employment opportunities surge.",
        "housing_crisis": "Housing crisis strikes. Real estate prices soar."
    }
    
    description = event_effects.get(event_type, "Unknown event occurred")
    
    if event_type == "recession":
        for agent in agents:
            new_wealth = agent.get('resources', {}).get('wealth', 0) * 0.8
            await db.agents.update_one(
                {"id": agent['id']},
                {"$set": {"resources.wealth": new_wealth}}
            )
    elif event_type == "boom":
        for agent in agents:
            new_wealth = agent.get('resources', {}).get('wealth', 0) * 1.3
            await db.agents.update_one(
                {"id": agent['id']},
                {"$set": {"resources.wealth": new_wealth}}
            )
    elif event_type == "pandemic":
        for agent in agents:
            new_happiness = max(20, agent.get('emotional_state', {}).get('happiness', 70) - 20)
            await db.agents.update_one(
                {"id": agent['id']},
                {"$set": {"emotional_state.happiness": new_happiness}}
            )
    
    event = Event(
        world_id=world_id,
        event_type="god_mode",
        description=description,
        involved_agents=[]
    )
    event_dict = event.model_dump()
    event_dict['timestamp'] = event_dict['timestamp'].isoformat()
    await db.events.insert_one(event_dict)
    
    return {"message": description}
