import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Button,
  Dialog, DialogTitle, DialogContent, TextField, DialogActions,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Chip, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { Add, Edit, Delete, CheckCircle } from '@mui/icons-material';
import { taskService } from '../services/api';

function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending'
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await taskService.getTasks();
      setTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editTask) {
        await taskService.updateTask(editTask.id, formData);
      } else {
        await taskService.createTask(formData);
      }
      setOpen(false);
      setEditTask(null);
      setFormData({ title: '', description: '', priority: 'medium', status: 'pending' });
      loadTasks();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleEdit = (task) => {
    setEditTask(task);
    setFormData(task);
    setOpen(true);
  };

  const handleDelete = async (taskId) => {
    try {
      await taskService.deleteTask(taskId);
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateTask(taskId, { status: newStatus });
      loadTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Task Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpen(true)}
        >
          Add Task
        </Button>
      </Box>

      <List>
        {tasks.map((task) => (
          <Card key={task.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="start">
                <Box flex={1}>
                  <Typography variant="h6" gutterBottom>
                    {task.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {task.description}
                  </Typography>
                  <Box display="flex" gap={1} mt={1}>
                    <Chip
                      label={task.priority}
                      color={getPriorityColor(task.priority)}
                      size="small"
                    />
                    <Chip
                      label={task.status}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </Box>
                <Box>
                  <IconButton
                    onClick={() => handleStatusChange(task.id, 
                      task.status === 'completed' ? 'pending' : 'completed')}
                    color={task.status === 'completed' ? 'success' : 'default'}
                  >
                    <CheckCircle />
                  </IconButton>
                  <IconButton onClick={() => handleEdit(task)}>
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(task.id)} color="error">
                    <Delete />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </List>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            fullWidth
            variant="outlined"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={formData.priority}
              label="Priority"
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              label="Status"
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="in-progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editTask ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default TaskList;