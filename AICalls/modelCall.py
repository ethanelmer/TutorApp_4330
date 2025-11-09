import os
from openai import OpenAI
from typing import List
from dotenv import load_dotenv
from pathlib import Path

# Load the environment variables from .env file
env_path = Path(__file__).parent.parent / 'BackEnd' / '.env'
load_dotenv(env_path)

# Get the token from environment variables
hf_token = os.getenv('HF_TOKEN')
if not hf_token:
    raise ValueError("HF_TOKEN not found in environment variables. Please make sure it's set in the .env file.")

client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=hf_token,
)

def get_model_response(prompt: str, chunks: List[str]) -> str:
    # Combine chunks into context
    context = "\n".join(chunks)
    
    # Create the system message with instructions
    system_message = {
        "role": "system",
        "content": "You are a helpful AI tutor. Use the following context from the uploaded documents to answer the user's question. If the context doesn't contain relevant information, say so."
    }
    
    # Create the context message
    context_message = {
        "role": "system",
        "content": f"Context from documents:\n{context}"
    }
    
    # Create the user message with their prompt
    user_message = {
        "role": "user",
        "content": prompt
    }
    
    # Get completion from the model
    completion = client.chat.completions.create(
        model="moonshotai/Kimi-K2-Thinking:novita",
        messages=[
            system_message,
            context_message,
            user_message
        ],
    )
    
    # Return the model's response
    return completion.choices[0].message.content
