# Product Overview

This is a React-based web application built with AWS Amplify that creates ebooks from YouTube channels using AI. The application provides:

- **User Authentication**: Email-based authentication with AWS Cognito
- **Channel Management**: Users can create, view, and delete YouTube channels (each channel has a URL)
- **Ebook Generation**: AI-powered ebook creation from YouTube channel content
- **Ebook Library**: Users can view and download generated ebooks for each channel
- **Real-time Updates**: Uses Amplify's observeQuery for live data synchronization
- **User Isolation**: Each user can only access their own channels and ebooks (owner-based authorization)

The app follows a simple CRUD pattern with a focus on real-time collaboration and secure user data isolation. Each channel can have multiple generated ebooks, with metadata including title, page count, generation date, source videos, and download links.