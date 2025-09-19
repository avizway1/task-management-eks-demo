import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Button,
  Dialog, DialogTitle, DialogContent, TextField, DialogActions,
  IconButton, Chip, FormControl, InputLabel, Select, MenuItem,
  Grid, Fab, Paper, Divider
} from '@mui/material';
import { 
  Add, Edit, Delete, CheckCircle, Schedule, PlayArrow,
  FilterList, Search, MoreVert
} from '@mui/icons-material';
import { taskService } from '../services/api';
import Navigation from './Navigation';

function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending'
  });

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    filterTasks();
  }, [tasks, searchTerm, statusFilter, priorityFilter]);

  const loadTasks = async () => {
    try {
      const response = await taskService.getTasks();
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const filterTasks = () => {
    let filtered = tasks;

    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    setFilteredTasks(filtered);
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
    setFormData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status
    });
    setOpen(true);
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await taskService.deleteTask(taskId);
        loadTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      await taskService.updateTask(taskId, { ...task, status: newStatus });
      loadTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle />;
      case 'in-progress': return <PlayArrow />;
      default: return <Schedule />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return { bg: '#f0fdf4', color: '#10b981' };
      case 'in-progress': return { bg: '#fffbeb', color: '#f59e0b' };
      default: return { bg: '#fef2f2', color: '#ef4444' };
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return { bg: '#fef2f2', color: '#ef4444' };
      case 'medium': return { bg: '#fffbeb', color: '#f59e0b' };
      default: return { bg: '#f0fdf4', color: '#10b981' };
    }
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Navigation />
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Task Management
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Organize and track your tasks efficiently
          </Typography>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in-progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priorityFilter}
                  label="Priority"
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">All Priority</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Task Grid */}
        <Grid container spacing={3}>
          {filteredTasks.map((task) => {
            const statusStyle = getStatusColor(task.status);
            const priorityStyle = getPriorityColor(task.priority);
            
            return (
              <Grid item xs={12} md={6} lg={4} key={task.id}>
                <Card
                  sx={{
                    height: '100%',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      transition: 'transform 0.2s ease-in-out',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 600, flex: 1 }}>
                        {task.title}
                      </Typography>
                      <IconButton size="small" onClick={() => handleEdit(task)}>
                        <MoreVert />
                      </IconButton>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 40 }}>
                      {task.description}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                      <Chip
                        icon={getStatusIcon(task.status)}
                        label={task.status.replace('-', ' ')}
                        size="small"
                        sx={{
                          bgcolor: statusStyle.bg,
                          color: statusStyle.color,
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}
                      />
                      <Chip
                        label={task.priority}
                        size="small"
                        sx={{
                          bgcolor: priorityStyle.bg,
                          color: priorityStyle.color,
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}
                      />
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(task)}
                          sx={{ color: 'primary.main' }}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(task.id)}
                          sx={{ color: 'error.main' }}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                      
                      {task.status !== 'completed' && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleStatusChange(task.id, 
                            task.status === 'pending' ? 'in-progress' : 'completed'
                          )}
                          sx={{ borderRadius: 2 }}
                        >
                          {task.status === 'pending' ? 'Start' : 'Complete'}
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {filteredTasks.length === 0 && (
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No tasks found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {tasks.length === 0 ? 'Create your first task to get started!' : 'Try adjusting your filters.'}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpen(true)}
              sx={{ borderRadius: 2 }}
            >
              Create Task
            </Button>
          </Paper>
        )}

        {/* Floating Action Button */}
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'linear-gradient(45deg, #2563eb 30%, #3b82f6 90%)',
          }}
          onClick={() => setOpen(true)}
        >
          <Add />
        </Fab>

        {/* Task Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ pb: 1 }}>
            {editTask ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
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
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
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
              </Grid>
              <Grid item xs={6}>
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
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setOpen(false)} sx={{ borderRadius: 2 }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              sx={{ borderRadius: 2 }}
            >
              {editTask ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}

export default TaskList;
