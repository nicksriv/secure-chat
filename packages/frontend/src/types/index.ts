export interface User {
  _id: string;
  email: string;
  name: string;
}

export interface Group {
  _id: string;
  name: string;
  ownerId: string;
  members: string[];
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  groupId: string;
  senderId: string | { _id: string; email: string };
  senderName?: string;
  senderAvatar?: string;
  content: string;
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SmartReply {
  text: string;
  confidence: number;
}