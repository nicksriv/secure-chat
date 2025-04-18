import mongoose from 'mongoose';

export interface IGroup extends mongoose.Document {
  name: string;
  ownerId: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Ensure owner is always a member
groupSchema.pre('save', function(next) {
  if (!this.members.includes(this.ownerId)) {
    this.members.push(this.ownerId);
  }
  next();
});

export const Group = mongoose.model<IGroup>('Group', groupSchema);