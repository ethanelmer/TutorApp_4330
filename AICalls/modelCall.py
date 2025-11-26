import os
import time
from openai import OpenAI, RateLimitError, APITimeoutError, InternalServerError
from typing import List
from dotenv import load_dotenv
from pathlib import Path
import httpx

# Load the environment variables from .env file
env_path = Path(__file__).parent.parent / 'BackEnd' / '.env'
load_dotenv(env_path)

# Get the token from environment variables
hf_token = os.getenv('HF_TOKEN')
if not hf_token:
    raise ValueError("HF_TOKEN not found in environment variables. Please make sure it's set in the .env file.")

# Create client with timeout settings (120 seconds for quiz generation)
client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=hf_token,
    timeout=httpx.Timeout(120.0, connect=10.0),
    max_retries=2
)

def get_model_response(prompt: str, chunks: List[str], conversation_history: str = None, max_retries: int = 3) -> str:
    """
    Get a response from the AI model with optional conversation history.

    Args:
        prompt: The user's current question
        chunks: Relevant document chunks for context
        conversation_history: Optional formatted conversation history
        max_retries: Maximum number of retry attempts for rate limits

    Returns:
        The model's response as a string

    Raises:
        RateLimitError: If rate limit persists after all retries
        Exception: For other API errors
    """
    # Combine chunks into context
    context = "\n".join(chunks)

    # Create the system message with instructions
    system_content = "You are a helpful AI tutor. Use the following context from the uploaded documents to answer the user's question. If the context doesn't contain relevant information, say so."

    # If conversation history is provided, include it in the system message
    if conversation_history:
        system_content += f"\n\nPrevious conversation:\n{conversation_history}\n\nUse this conversation history to provide contextually relevant responses."

    system_message = {
        "role": "system",
        "content": system_content
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

    # Retry logic with exponential backoff for rate limits
    for attempt in range(max_retries):
        try:
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

        except RateLimitError as e:
            if attempt < max_retries - 1:
                # Exponential backoff: wait 2^attempt seconds
                wait_time = 2 ** attempt
                print(f"[modelCall] Rate limit hit. Retrying in {wait_time} seconds... (attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
            else:
                # Final attempt failed
                print(f"[modelCall] Rate limit persisted after {max_retries} attempts")
                raise RateLimitError(
                    "The AI service is currently experiencing high demand. Please wait a moment and try again.",
                    response=e.response,
                    body=e.body
                )
        except (APITimeoutError, InternalServerError) as e:
            # Handle timeouts and 5xx errors with retry
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                print(f"[modelCall] {type(e).__name__} occurred. Retrying in {wait_time} seconds... (attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
            else:
                print(f"[modelCall] {type(e).__name__} persisted after {max_retries} attempts")
                raise Exception(f"The AI service is temporarily unavailable (timeout/server error). Please try again in a few minutes.")
        except Exception as e:
            # Non-rate-limit errors, raise immediately
            print(f"[modelCall] API error: {type(e).__name__}: {e}")
            raise
