# Product Overview

You2Book is a web application that lets authenticated users track YouTube channels and generate ebooks from their video content.

## Core Functionality

- Users add YouTube channels by URL. The app fetches channel metadata and all videos via the YouTube Data API.
- Channels, videos, and generated ebooks are stored per-user (owner-based authorization).
- Users can browse their channels, view video lists, and download generated PDF ebooks.
- An AI agent (Strands-based, running on AWS Bedrock AgentCore) can be invoked for intelligent processing tasks like suggesting book groupings from channel videos.

## Key Entities

- **Channel** — a tracked YouTube channel with name, URL, and YouTube channel ID
- **Video** — a YouTube video belonging to a channel, with metadata (title, description, duration, summary)
- **Ebook** — a generated PDF ebook from channel videos, with page count and source video references
- **EbookVideo** — join record linking an ebook to its source videos
- **BookGroup** — a thematic grouping of videos within a channel, suggested by the AI agent
