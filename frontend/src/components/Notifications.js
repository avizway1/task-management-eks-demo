import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Button,
  Dialog, DialogTitle, DialogContent, TextField, DialogActions,
  List, ListItem, ListItemText, ListItemIcon, Chip, Tab, Tabs,
  AppBar, Toolbar, IconButton, Menu, MenuItem as MenuItemNav,
  Alert, Snackbar, FormControl, InputLabel, Select, MenuItem,
  Divider, Paper
} from '@mui/material';
import {
  Dashboard, AccountCircle, ExitToApp, Email, Send, History,
  Notifications as NotificationsIcon, Task, CheckCircle, Schedule
} from '@mui/icons-material';
import { notificationService, taskService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function Notifications() {
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Email form state
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    message: ''
  });
  
  // Task reminder form state
  const [reminderForm, setReminderForm] = useState({
    taskId: '',
    message: ''
  });

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (tabValue === 1) {
      loadNotificationHistory();
    } else if (tabValue === 2) {
      loadTasks();
    }
  }, [tabValue]);

  const loadNotificationHistory = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getHistory(user.id);
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      showSnackbar('Error loading notification history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await taskService.getTasks();
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      showSnackbar('Error loading tasks', 'error');
    }
  };

  const handleSendEmail = async () => {
    try {
      if (!emailForm.to || !emailForm.subject || !emailForm.message) {
        showSnackbar('Please fill in all fields', 'error');
        return;
      }

      setLoading(true);
      await notificationService.sendEmail({
        to: emailForm.to,
        subject: emailForm.subject,
        text: emailForm.message,
        html: `<p>${emailForm.message.replace(/\n/g, '<br>')}</p>`,
        userId: user.id
      });

      setEmailForm({ to: '', subject: '', message: '' });
      showSnackbar('Email sent successfully!', 'success');
    } catch (error) {
      console.error('Error sending email:', error);
      showSnackbar('Failed to send email', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTaskReminder = async () => {
    try {
      if (!reminderForm.taskId) {
        showSnackbar('Please select a task', 'error');
        return;
      }

      const selectedTask = tasks.find(t => t.id === reminderForm.taskId);
      if (!selectedTask) {
        showSnackbar('Task not found', 'error');
        return;
      }

      setLoading(true);
      await notificationService.sendTaskReminder({
        userId: user.id,
        taskId: selectedTask.id,
        taskTitle: selectedTask.title,
        dueDate: selectedTask.dueDate
      });

      setReminderForm({ taskId: '', message: '' });
      showSnackbar('Task reminder sent successfully!', 'success');
    } catch (error) {
      console.error('Error sending task reminder:', error);
      showSnackbar('Failed to send task reminder', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      setLoading(true);
      await notificationService.testEmail(user.email);
      showSnackbar('Test email sent to your registered email!', 'success');
    } catch (error) {
      console.error('Error sending test email:', error);
      showSnackbar('Failed to send test email', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'email': return <Email />;
      case 'task-reminder': return <Schedule />;
      default: return <NotificationsIcon />;
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Notifications
          </Typography>
          <Button
            color="inherit"
            startIcon={<Dashboard />}
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            Dashboard
          </Button>
          <div>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              keepMounted
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItemNav onClick={handleClose}>
                {user?.firstName} {user?.lastName}
              </MenuItemNav>
              <MenuItemNav onClick={handleLogout}>
                <ExitToApp sx={{ mr: 1 }} /> Logout
              </MenuItemNav>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Notification Center
        </Typography>

        <Paper sx={{ width: '100%', mb: 2 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Send Email" icon={<Email />} />
            <Tab label="History" icon={<History />} />
            <Tab label="Task Reminders" icon={<Task />} />
          </Tabs>
        </Paper>

        {/* Send Email Tab */}
        {tabValue === 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Send Email Notification
              </Typography>
              <Box component="form" sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="To (Email Address)"
                  value={emailForm.to}
                  onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                  sx={{ mb: 2 }}
                  placeholder="recipient@example.com"
                />
                <TextField
                  fullWidth
                  label="Subject"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Message"
                  multiline
                  rows={4}
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    startIcon={<Send />}
                    onClick={handleSendEmail}
                    disabled={loading}
                  >
                    Send Email
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleTestEmail}
                    disabled={loading}
                  >
                    Send Test Email to Me
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Notification History Tab */}
        {tabValue === 1 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notification History
              </Typography>
              {loading ? (
                <Typography>Loading...</Typography>
              ) : notifications.length === 0 ? (
                <Typography color="textSecondary">No notifications found</Typography>
              ) : (
                <List>
                  {notifications.map((notification, index) => (
                    <React.Fragment key={notification.id}>
                      <ListItem>
                        <ListItemIcon>
                          {getNotificationIcon(notification.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={notification.subject || `${notification.type} notification`}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="textSecondary">
                                To: {notification.to}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {formatDate(notification.timestamp)}
                              </Typography>
                            </Box>
                          }
                        />
                        <Chip
                          label={notification.status}
                          color={notification.status === 'sent' ? 'success' : 'default'}
                          size="small"
                        />
                      </ListItem>
                      {index < notifications.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        )}

        {/* Task Reminders Tab */}
        {tabValue === 2 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Send Task Reminder
              </Typography>
              <Box component="form" sx={{ mt: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Task</InputLabel>
                  <Select
                    value={reminderForm.taskId}
                    label="Select Task"
                    onChange={(e) => setReminderForm({ ...reminderForm, taskId: e.target.value })}
                  >
                    {tasks.map((task) => (
                      <MenuItem key={task.id} value={task.id}>
                        <Box>
                          <Typography variant="body1">{task.title}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            Status: {task.status} | Priority: {task.priority}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={<Send />}
                  onClick={handleSendTaskReminder}
                  disabled={loading || !reminderForm.taskId}
                >
                  Send Task Reminder
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default Notifications;