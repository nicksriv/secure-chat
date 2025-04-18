import { Request, Response } from 'express';
import { User } from '../models/User';
import { generateToken } from '../utils/jwt';
import { TokenPayload } from '../types';
import * as crypto from 'crypto';
import { sendResetPasswordEmail } from '../services/emailService';

interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const register = async (req: Request, res: Response) => {
  console.log('Register endpoint hit with body:', req.body);
  try {
    const { email, password, name } = req.body;

    // Input validation
    if (!email || !password || !name) {
      console.log('Registration failed: Missing required fields');
      return res.status(400).json({ message: 'Email, password and name are required' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Registration failed: Invalid email format');
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Password validation
    if (password.length < 8) {
      console.log('Registration failed: Password too short');
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    // Name validation
    if (name.length < 2) {
      console.log('Registration failed: Name too short');
      return res.status(400).json({ message: 'Name must be at least 2 characters long' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Registration failed: Email already exists');
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = new User({ email, password, name });
    await user.save();
    console.log('User registered successfully:', { userId: user._id, email: user.email, name: user.name });

    const token = generateToken(user._id, user.email);
    res.status(201).json({ token, userId: user._id, name: user.name });
  } catch (error) {
    console.error('Registration error details:', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body
    });
    if (error instanceof Error) {
      res.status(500).json({ message: `Error registering user: ${error.message}` });
    } else {
      res.status(500).json({ message: 'Error registering user' });
    }
  }
};

export const login = async (req: Request, res: Response) => {
  console.log('Login endpoint hit with body:', req.body);
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log('Login failed: User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      console.log('Login failed: Invalid password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, user.email);
    console.log('User logged in successfully:', { userId: user._id, email: user.email, name: user.name });
    res.json({ token, userId: user._id, name: user.name });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    // In a more complex implementation, you might want to:
    // 1. Add the token to a blacklist
    // 2. Clear any server-side sessions
    // 3. Handle socket disconnection
    
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Error during logout' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't reveal whether the email exists
      return res.status(200).json({ 
        message: 'If an account exists with this email, you will receive password reset instructions.' 
      });
    }

    // Generate a reset token that expires in 1 hour
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    try {
      await sendResetPasswordEmail(email, resetToken);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // Reset the token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      throw new Error('Failed to send reset email');
    }

    res.status(200).json({
      message: 'Password reset instructions sent to your email.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing password reset request' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password successfully reset' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};