import express from 'express';
import * as authController from '../controllers/authController';

const router = express.Router();

// Handle OPTIONS requests explicitly
router.options('*', (req, res) => {
  res.sendStatus(200);
});

// Add request logging middleware for debugging
router.use((req, res, next) => {
  console.log(`Auth route accessed: ${req.method} ${req.path}`);
  console.log('Request body:', req.body);
  next();
});

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export default router;