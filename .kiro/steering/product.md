# Product Overview

This is a React-based web application built with AWS Amplify that manages channels. The application provides:

- **User Authentication**: Email-based authentication with AWS Cognito
- **Channel Management**: Users can create, view, and delete channels (each channel has a URL)
- **Real-time Updates**: Uses Amplify's observeQuery for live data synchronization
- **User Isolation**: Each user can only access their own channels (owner-based authorization)

The app follows a simple CRUD pattern with a focus on real-time collaboration and secure user data isolation.