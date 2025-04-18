import { Request, Response } from 'express';
import { Group } from '../models/Group';
import mongoose from 'mongoose';

export const createGroup = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.user?.userId;

    const group = new Group({
      name,
      ownerId: userId,
      members: [userId]
    });

    await group.save();
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Error creating group' });
  }
};

export const getAllGroups = async (req: Request, res: Response) => {
  try {
    const groups = await Group.find();
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching groups' });
  }
};

export const joinGroup = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const userId = req.user?.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.members.includes(new mongoose.Types.ObjectId(userId))) {
      return res.status(400).json({ message: 'Already a member of this group' });
    }

    group.members.push(new mongoose.Types.ObjectId(userId));
    await group.save();

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Error joining group' });
  }
};

export const leaveGroup = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const userId = req.user?.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.ownerId.toString() === userId) {
      return res.status(400).json({ message: 'Owner cannot leave group without assigning new owner' });
    }

    group.members = group.members.filter(memberId => memberId.toString() !== userId);
    await group.save();

    res.json({ message: 'Successfully left the group' });
  } catch (error) {
    res.status(500).json({ message: 'Error leaving group' });
  }
};

export const transferOwnership = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { newOwnerId } = req.body;
    const userId = req.user?.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.ownerId.toString() !== userId) {
      return res.status(403).json({ message: 'Only owner can transfer ownership' });
    }

    if (!group.members.includes(new mongoose.Types.ObjectId(newOwnerId))) {
      return res.status(400).json({ message: 'New owner must be a member of the group' });
    }

    group.ownerId = new mongoose.Types.ObjectId(newOwnerId);
    await group.save();

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Error transferring ownership' });
  }
};

export const deleteGroup = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const userId = req.user?.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.ownerId.toString() !== userId) {
      return res.status(403).json({ message: 'Only owner can delete the group' });
    }

    await group.deleteOne();
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting group' });
  }
};