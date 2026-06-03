import os
import random
from typing import List, Dict, Any
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
import asyncio

load_dotenv()

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

MODEL_ROTATION = [
    ("openai", "gpt-5.2"),
    ("anthropic", "claude-sonnet-4-6"),
    ("gemini", "gemini-3-flash-preview")
]

current_model_index = 0

def get_next_model():
    global current_model_index
    model = MODEL_ROTATION[current_model_index]
    current_model_index = (current_model_index + 1) % len(MODEL_ROTATION)
    return model

async def generate_agent_decision(agent_data: Dict[str, Any], world_context: Dict[str, Any]) -> Dict[str, str]:
    """Generate a decision for an agent using AI"""
    provider, model = get_next_model()
    
    prompt = f"""
You are simulating an agent in a living city. Generate a decision for this agent.

Agent Profile:
- Name: {agent_data['name']}
- Age: {agent_data['age']}
- Occupation: {agent_data['occupation']}
- Personality: Ambition {agent_data['personality']['ambition']}, Kindness {agent_data['personality']['kindness']}, Sociability {agent_data['personality']['sociability']}
- Emotional State: Happiness {agent_data['emotional_state']['happiness']}, Stress {agent_data['emotional_state']['stress']}
- Wealth: ${agent_data['resources']['wealth']:.0f}
- Goals: {', '.join([g['description'] for g in agent_data['goals'][:3]])}

World Context:
- Population: {world_context.get('population', 100)}
- Average Happiness: {world_context.get('average_happiness', 70)}
- Employment Rate: {world_context.get('employment_rate', 85)}%

Generate a SHORT decision (1-2 sentences) this agent would make today. Consider their personality and goals.
Format: Just the action, no explanation.
Examples: "Started a tech startup", "Asked Emma on a date", "Quit their job", "Donated to charity"
"""
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"agent-{agent_data['id']}",
            system_message="You are a city simulation AI. Generate realistic, concise agent actions."
        ).with_model(provider, model)
        
        response_text = ""
        async for event in chat.stream_message(UserMessage(text=prompt)):
            if hasattr(event, 'content'):
                response_text += event.content
            elif hasattr(event, '__class__') and event.__class__.__name__ == 'StreamDone':
                break
        
        decision = response_text.strip()
        return {
            "action": decision[:200],
            "reasoning": f"Based on personality and goals"
        }
    except Exception as e:
        return {
            "action": random.choice([
                "Worked on current projects",
                "Socialized with friends",
                "Focused on personal goals",
                "Explored new opportunities"
            ]),
            "reasoning": "Default action"
        }

async def generate_story_summary(story_type: str, agents: List[str], events: List[str]) -> str:
    """Generate a story summary using AI"""
    provider, model = get_next_model()
    
    prompt = f"""
Generate a compelling story summary for a city simulation.

Story Type: {story_type}
Involved Agents: {', '.join(agents)}
Key Events: {', '.join(events[:5])}

Write a 2-3 sentence engaging story summary.
"""
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"story-{random.randint(1000, 9999)}",
            system_message="You are a creative writer for a city simulation game."
        ).with_model(provider, model)
        
        response_text = ""
        async for event in chat.stream_message(UserMessage(text=prompt)):
            if hasattr(event, 'content'):
                response_text += event.content
            elif hasattr(event, '__class__') and event.__class__.__name__ == 'StreamDone':
                break
        
        return response_text.strip()[:500]
    except Exception as e:
        return f"A {story_type} story involving {', '.join(agents[:2])}."

async def generate_newspaper_article(headline: str, section: str, events: List[str]) -> str:
    """Generate a newspaper article using AI"""
    provider, model = get_next_model()
    
    prompt = f"""
Write a short newspaper article for a city simulation.

Section: {section}
Headline: {headline}
Recent Events: {', '.join(events[:3])}

Write a 3-4 sentence article in journalistic style.
"""
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"news-{random.randint(1000, 9999)}",
            system_message="You are a newspaper journalist."
        ).with_model(provider, model)
        
        response_text = ""
        async for event in chat.stream_message(UserMessage(text=prompt)):
            if hasattr(event, 'content'):
                response_text += event.content
            elif hasattr(event, '__class__') and event.__class__.__name__ == 'StreamDone':
                break
        
        return response_text.strip()[:800]
    except Exception as e:
        return f"{headline}. The city continues to evolve with new developments daily."
