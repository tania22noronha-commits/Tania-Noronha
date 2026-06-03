import random  # Note: Using random for simulation/game logic, not security-critical operations
from typing import List
from models import Agent, PersonalityTraits, EmotionalState, Resources, Goal

FIRST_NAMES = [
    "Emma", "Noah", "Olivia", "Liam", "Ava", "Ethan", "Sophia", "Mason", "Isabella", "William",
    "Mia", "James", "Charlotte", "Benjamin", "Amelia", "Lucas", "Harper", "Henry", "Evelyn", "Alexander",
    "Abigail", "Michael", "Emily", "Daniel", "Elizabeth", "Matthew", "Sofia", "Jackson", "Avery", "Sebastian",
    "Ella", "David", "Madison", "Joseph", "Scarlett", "Carter", "Victoria", "Owen", "Aria", "Wyatt",
    "Grace", "John", "Chloe", "Jack", "Camila", "Luke", "Penelope", "Jayden", "Riley", "Dylan",
    "Layla", "Grayson", "Lillian", "Levi", "Nora", "Isaac", "Zoey", "Gabriel", "Mila", "Julian",
    "Aubrey", "Mateo", "Hannah", "Anthony", "Lily", "Jaxon", "Addison", "Lincoln", "Eleanor", "Joshua",
    "Natalie", "Christopher", "Luna", "Andrew", "Savannah", "Theodore", "Brooklyn", "Caleb", "Leah", "Ryan",
    "Zoe", "Asher", "Stella", "Nathan", "Hazel", "Thomas", "Ellie", "Leo", "Paisley", "Isaiah",
    "Audrey", "Charles", "Skylar", "Josiah", "Violet", "Hudson", "Claire", "Christian", "Bella", "Hunter"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts"
]

OCCUPATIONS = [
    "Software Engineer", "Teacher", "Doctor", "Nurse", "Artist", "Chef", "Accountant", "Lawyer", "Mechanic", "Plumber",
    "Electrician", "Architect", "Designer", "Writer", "Journalist", "Photographer", "Musician", "Salesperson", "Manager", "Entrepreneur",
    "Consultant", "Analyst", "Scientist", "Researcher", "Librarian", "Barista", "Waiter", "Retail Worker", "Security Guard", "Delivery Driver",
    "Construction Worker", "Real Estate Agent", "Banker", "Marketing Specialist", "HR Manager", "Police Officer", "Firefighter", "Paramedic", "Veterinarian", "Dentist",
    "Pharmacist", "Therapist", "Social Worker", "Pastor", "Athlete", "Coach", "Student", "Unemployed", "Retired", "Freelancer"
]

GOAL_TEMPLATES = [
    "Become wealthy",
    "Start a successful company",
    "Become famous",
    "Find true love",
    "Build a happy family",
    "Gain political power",
    "Learn new skills",
    "Buy a house",
    "Travel the world",
    "Help the community",
    "Create a masterpiece",
    "Achieve work-life balance"
]

def generate_agent(world_id: str) -> Agent:
    name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
    age = random.randint(18, 75)
    gender = random.choice(["Male", "Female", "Non-binary"])
    occupation = random.choice(OCCUPATIONS)
    
    personality = PersonalityTraits(
        ambition=random.randint(20, 100),
        kindness=random.randint(20, 100),
        intelligence=random.randint(20, 100),
        creativity=random.randint(20, 100),
        sociability=random.randint(20, 100),
        risk_tolerance=random.randint(20, 100),
        discipline=random.randint(20, 100),
        honesty=random.randint(20, 100)
    )
    
    emotional_state = EmotionalState(
        happiness=random.randint(40, 90),
        stress=random.randint(10, 70),
        confidence=random.randint(30, 90),
        motivation=random.randint(40, 90)
    )
    
    wealth = random.uniform(10000, 200000)
    income = random.uniform(30000, 150000)
    resources = Resources(wealth=wealth, income=income)
    
    num_goals = random.randint(2, 4)
    goals = [Goal(description=random.choice(GOAL_TEMPLATES), progress=random.randint(0, 30)) for _ in range(num_goals)]
    
    districts = ["Residential", "Commercial", "Industrial", "Entertainment", "Government", "Parks"]
    location = {"district": random.choice(districts), "building": "Home"}
    
    return Agent(
        world_id=world_id,
        name=name,
        age=age,
        gender=gender,
        occupation=occupation,
        personality=personality,
        emotional_state=emotional_state,
        resources=resources,
        goals=goals,
        location=location
    )

def generate_agents(world_id: str, count: int = 100) -> List[Agent]:
    return [generate_agent(world_id) for _ in range(count)]
