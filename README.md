# Secure Group Messaging App

A real-time group messaging application with end-to-end encryption and AI-powered smart replies.

## Features

- User authentication with JWT
- Real-time messaging using WebSocket
- End-to-end message encryption (AES-128)
- Group creation and management
- Smart replies powered by AI
- Read receipts and typing indicators
- Responsive web interface

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- pnpm package manager

## Setup Instructions

1. Clone the repository

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Generate encryption keys:
   ```bash
   ./scripts/generate-key.js
   ```
   This will generate a secure AES-128 encryption key. Add the generated key to both:
   - `packages/backend/.env` as ENCRYPTION_KEY
   - `packages/frontend/.env` as VITE_ENCRYPTION_KEY

4. Set up environment variables:
   
   Backend (`packages/backend/.env`):
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/secure-chat
   JWT_SECRET=your-secret-key-here
   ENCRYPTION_KEY=your-generated-encryption-key
   FRONTEND_URL=http://localhost:5173
   ```

   Frontend (`packages/frontend/.env`):
   ```
   VITE_API_URL=http://localhost:5000
   REACT_APP_SOCKET_URL=http://localhost:5000
   VITE_ENCRYPTION_KEY=your-generated-encryption-key
   ```

   Note: Make sure to use the same encryption key in both frontend and backend .env files for end-to-end encryption to work properly.

5. Start the development servers:
   ```bash
   pnpm dev
   ```
   This will start both the frontend (port 5173) and backend (port 5000) servers.

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
- Register a new user
- Body: `{ "email": string, "password": string }`
- Response: `{ "token": string, "userId": string }`

#### POST /api/auth/login
- Login existing user
- Body: `{ "email": string, "password": string }`
- Response: `{ "token": string, "userId": string }`

### Group Endpoints

#### POST /api/groups
- Create a new group
- Auth required
- Body: `{ "name": string }`
- Response: Group object

#### GET /api/groups
- Get all groups
- Auth required
- Response: Array of group objects

#### POST /api/groups/:groupId/join
- Join a group
- Auth required
- Response: Updated group object

#### POST /api/groups/:groupId/leave
- Leave a group
- Auth required
- Response: Success message

#### POST /api/groups/:groupId/transfer-ownership
- Transfer group ownership
- Auth required
- Body: `{ "newOwnerId": string }`
- Response: Updated group object

#### DELETE /api/groups/:groupId
- Delete a group
- Auth required (owner only)
- Response: Success message

### Message Endpoints

#### POST /api/messages
- Send a message to a group
- Auth required
- Body: `{ "groupId": string, "content": string }`
- Response: Message object

#### GET /api/messages/group/:groupId
- Get all messages in a group
- Auth required
- Response: Array of message objects

#### POST /api/messages/:messageId/read
- Mark message as read
- Auth required
- Response: Updated message object

#### GET /api/messages/:messageId/smart-replies
- Get AI-generated smart replies for a message
- Auth required
- Response: `{ "suggestions": Array<{ text: string, confidence: number }> }`

## WebSocket Events

### Client -> Server
- `join_group`: Join a group chat room
- `leave_group`: Leave a group chat room
- `send_message`: Send a message to a group
- `typing`: Indicate user is typing

### Server -> Client
- `receive_message`: Receive a new message
- `user_typing`: Receive typing indicator

## Known Issues and Limitations

1. Smart Reply Feature:
   - Currently using placeholder responses
   - Integration with actual LLM API pending

2. Media Sharing:
   - File upload functionality not implemented
   - Placeholders for AWS S3/Azure Blob storage integration present

3. Security:
   - Client-side encryption key management needs improvement
   - Should implement proper key exchange mechanism

4. Performance:
   - Message pagination not implemented
   - Large message history might cause performance issues

## Future Improvements

1. Implement actual LLM integration for smart replies
2. Add file upload functionality with cloud storage
3. Implement proper key exchange for E2E encryption
4. Add message pagination
5. Add user profiles and avatars
6. Implement message editing and deletion
7. Add group chat settings and moderation tools
8. Add push notifications

## Security Notes

- The encryption key must be a 32-character hexadecimal string
- Keep your encryption keys secure and never commit them to version control
- Use different encryption keys for development and production environments
- Regularly rotate encryption keys in production environments
- Always validate environment variables before starting the application

## Development

### Generating New Encryption Keys

To generate a new encryption key for your development or production environment:

1. Run the key generation script:
   ```bash
   ./scripts/generate-key.js
   ```

2. Update both frontend and backend .env files with the new key
3. Restart both frontend and backend servers
4. Note: Changing encryption keys will make existing messages unreadable

### Environment Variables

The application requires several environment variables to be set properly:

#### Backend
- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT token generation
- `ENCRYPTION_KEY`: 32-character hex string for AES-128 encryption
- `FRONTEND_URL`: Frontend application URL

#### Frontend
- `VITE_API_URL`: Backend API URL
- `REACT_APP_SOCKET_URL`: WebSocket server URL
- `VITE_ENCRYPTION_KEY`: Same encryption key as backend

## Contributing

1. Generate a new encryption key for development
2. Never commit .env files or encryption keys
3. Use .env.example files as templates
4. Test encryption/decryption when making changes to message handling