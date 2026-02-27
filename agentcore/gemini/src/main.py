"""FastAPI application for the Gemini book generation AgentCore runtime.

Exposes /invocations (POST) to run the pipeline and upload results to S3,
and /ping (GET) for health checks.
"""

import logging
import os
import uuid

import boto3
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

from pipeline import run_pipeline

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Gemini Book Generator", version="1.0.0")


class InvocationRequest(BaseModel):
    input: Dict[str, Any]


class InvocationResponse(BaseModel):
    output: Dict[str, Any]


@app.post("/invocations", response_model=InvocationResponse)
async def invoke_agent(request: InvocationRequest):
    # Validate required environment variables
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_API_KEY environment variable is not set",
        )

    bucket_name = os.environ.get("OUTPUT_BUCKET_NAME", "")
    if not bucket_name:
        raise HTTPException(
            status_code=500,
            detail="OUTPUT_BUCKET_NAME environment variable is not set",
        )

    # Extract optional video URL from request
    video_url = request.input.get("video_url")
    logger.info(f"Starting pipeline | video_url={video_url or 'default'}")

    # Run the book generation pipeline
    try:
        book = run_pipeline(video_url)
    except Exception as e:
        logger.error(f"Pipeline failed | error={str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {str(e)}")

    # Generate unique S3 keys
    run_id = str(uuid.uuid4())
    s3_key_md = f"books/{run_id}/book.md"
    s3_key_json = f"books/{run_id}/book_output.json"

    # Build Markdown content from BookOutput
    md_content = f"# {book.book_title}\n\n"
    for wt in book.written_topics:
        md_content += f"{wt.content}\n\n---\n\n"

    # Upload artifacts to S3
    try:
        s3_client = boto3.client("s3")
        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key_md,
            Body=md_content.encode("utf-8"),
            ContentType="text/markdown",
        )
        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key_json,
            Body=book.model_dump_json(indent=2).encode("utf-8"),
            ContentType="application/json",
        )
        logger.info(f"Uploaded to S3 | bucket={bucket_name} | md={s3_key_md} | json={s3_key_json}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"S3 upload failed | error={str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"S3 upload failed: {str(e)}")

    return InvocationResponse(output={
        "s3_key_md": s3_key_md,
        "s3_key_json": s3_key_json,
        "book_title": book.book_title,
    })


@app.get("/ping")
async def ping():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
