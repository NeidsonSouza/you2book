from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime, timezone
from strands import Agent
import logging

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Strands Agent Server", version="1.0.0")

strands_agent = Agent(model="us.amazon.nova-micro-v1:0")

class InvocationRequest(BaseModel):
    input: Dict[str, Any]

class InvocationResponse(BaseModel):
    output: Dict[str, Any]

@app.post("/invocations", response_model=InvocationResponse)
async def invoke_agent(request: InvocationRequest):
    invocation_start = datetime.now(timezone.utc)
    
    try:
        user_message = request.input.get("prompt", "")
        if not user_message:
            logger.error(f"Missing prompt in request | timestamp={invocation_start.isoformat()}")
            raise HTTPException(
                status_code=400, 
                detail="No prompt found in input. Please provide a 'prompt' key in the input."
            )

        # Log request metadata
        logger.info(f"Processing request | timestamp={invocation_start.isoformat()} | promptLength={len(user_message)}")

        result = strands_agent(user_message)
        
        invocation_end = datetime.now(timezone.utc)
        response_message = result.message
        
        # Log response metadata
        logger.info(f"Request completed | timestamp={invocation_end.isoformat()} | messageLength={len(response_message)} | durationMs={(invocation_end - invocation_start).total_seconds() * 1000:.2f}")
        
        response = {
            "message": response_message,
            "timestamp": invocation_end.isoformat()
        }

        return InvocationResponse(output=response)

    except HTTPException:
        raise
    except Exception as e:
        error_type = type(e).__name__
        invocation_end = datetime.now(timezone.utc)
        logger.error(f"Agent processing failed | errorType={error_type} | timestamp={invocation_end.isoformat()} | error={str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Agent processing failed: {str(e)}")

@app.get("/ping")
async def ping():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
