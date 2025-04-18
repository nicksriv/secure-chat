import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const initializeDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secure-chat');
    console.log('Connected to MongoDB');
    
    // Create indexes
    await Promise.all([
      mongoose.connection.collection('users').createIndex({ email: 1 }, { unique: true }),
      mongoose.connection.collection('groups').createIndex({ name: 1 }),
      mongoose.connection.collection('messages').createIndex({ groupId: 1, createdAt: 1 })
    ]);
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

initializeDatabase();