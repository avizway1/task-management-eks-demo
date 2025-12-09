const express = require('express');
const axios = require('axios');
const { sendEmail, testEmailConfiguration, EMAIL_PROVIDER } = require('../services/emailService');

const router = express.Router();

// Send email notification
router.post('/email', async (req, res) => {
  try {
    const { to, subject, text, html, userId } = req.body;

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, and text/html' 
      });
    }

    // If userId provided, get user details
    let userEmail = to;
    if (userId && !to.includes('@')) {
      try {
        const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
        const userResponse = await axios.get(`${userServiceUrl}/api/users/${userId}`, {
          timeout: 5000
        });
        userEmail = userResponse.data.user.email;
      } catch (error) {
        console.warn('Could not fetch user email, using provided to address');
      }
    }

    const info = await sendEmail({
      from: process.env.SES_FROM_EMAIL || process.env.SMTP_USER || 'noreply@taskmanager.com',
      to: userEmail,
      subject,
      text,
      html
    });

    // Store notification in Redis for tracking
    const notificationId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notification = {
      id: notificationId,
      type: 'email',
      to: userEmail,
      subject,
      status: 'sent',
      messageId: info.messageId,
      timestamp: new Date().toISOString(),
      userId: userId || null
    };

    await req.redisClient.setEx(
      `notification:${notificationId}`, 
      86400, // 24 hours
      JSON.stringify(notification)
    );

    res.status(200).json({
      message: 'Email sent successfully',
      notificationId,
      messageId: info.messageId,
      provider: info.provider
    });
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Send task reminder notification
router.post('/task-reminder', async (req, res) => {
  try {
    const { userId, taskId, taskTitle, dueDate } = req.body;

    if (!userId || !taskId || !taskTitle) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, taskId, taskTitle' 
      });
    }

    // Get user details
    let userEmail;
    try {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
      const userResponse = await axios.get(`${userServiceUrl}/api/users/${userId}`, {
        timeout: 5000
      });
      userEmail = userResponse.data.user.email;
    } catch (error) {
      return res.status(400).json({ error: 'Could not fetch user details' });
    }

    const subject = `Task Reminder: ${taskTitle}`;
    const dueDateText = dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date set';
    
    const text = `
Hi there!

This is a reminder about your task: "${taskTitle}"
Due date: ${dueDateText}

Please log in to your task manager to view and update this task.

Best regards,
Task Management Team
    `;

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Task Reminder</h2>
  <p>Hi there!</p>
  <p>This is a reminder about your task:</p>
  <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
    <h3 style="margin: 0; color: #2c3e50;">${taskTitle}</h3>
    <p style="margin: 5px 0; color: #666;">Due date: ${dueDateText}</p>
  </div>
  <p>Please log in to your task manager to view and update this task.</p>
  <p>Best regards,<br>Task Management Team</p>
</div>
    `;

    // Send email using the email endpoint
    const emailResponse = await axios.post(`http://localhost:${process.env.PORT || 3003}/api/notifications/email`, {
      to: userEmail,
      subject,
      text,
      html,
      userId
    });

    res.status(200).json({
      message: 'Task reminder sent successfully',
      notificationId: emailResponse.data.notificationId
    });
  } catch (error) {
    console.error('Task reminder error:', error);
    res.status(500).json({ 
      error: 'Failed to send task reminder',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get notification history
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Get all notification keys for the user
    const keys = await req.redisClient.keys('notification:*');
    const notifications = [];

    for (const key of keys) {
      const notificationData = await req.redisClient.get(key);
      if (notificationData) {
        const notification = JSON.parse(notificationData);
        if (!userId || notification.userId === userId) {
          notifications.push(notification);
        }
      }
    }

    // Sort by timestamp (newest first)
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedNotifications = notifications.slice(startIndex, endIndex);

    res.json({
      notifications: paginatedNotifications,
      pagination: {
        total: notifications.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(notifications.length / limit)
      }
    });
  } catch (error) {
    console.error('Get notification history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification status
router.get('/status/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notificationData = await req.redisClient.get(`notification:${notificationId}`);
    
    if (!notificationData) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const notification = JSON.parse(notificationData);
    res.json({ notification });
  } catch (error) {
    console.error('Get notification status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test email configuration
router.post('/test-email', async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Email address required' });
    }

    const info = await sendEmail({
      from: process.env.SES_FROM_EMAIL || process.env.SMTP_USER || 'noreply@taskmanager.com',
      to,
      subject: 'Test Email - Task Management System',
      text: 'This is a test email from your Task Management System. If you received this, email notifications are working correctly!',
      html: '<p>This is a test email from your <strong>Task Management System</strong>.</p><p>If you received this, email notifications are working correctly!</p>'
    });

    res.status(200).json({
      message: 'Test email sent successfully',
      messageId: info.messageId,
      provider: info.provider
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get email provider info
router.get('/provider', (req, res) => {
  res.json({
    provider: EMAIL_PROVIDER,
    configured: EMAIL_PROVIDER === 'ses' 
      ? !!(process.env.SES_FROM_EMAIL || process.env.AWS_REGION)
      : !!(process.env.SMTP_USER && process.env.SMTP_PASS)
  });
});

module.exports = router;