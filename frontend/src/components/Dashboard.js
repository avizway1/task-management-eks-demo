import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, LinearProgress, Chip
} from '@mui/material';
import { 
  Assignment, CheckCircle, Schedule, PlayArrow, 
  TrendingUp, Add, Visibility 
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { taskService } from '../services/api';
import Navigation from './Navigation';

function Dashboard() {
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0
  });
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await taskService.getTasks();
      const tasks = response.data.tasks || [];
      
      setStats({
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        pendingTasks: tasks.filter(t => t.status === 'pending').length,
        inProgressTasks: tasks.filter(t => t.status === 'in-progress').length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const completionRate = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;

  const statCards = [
    {
      title: 'Total Tasks',
      value: stats.totalTasks,
      icon: <Assignment />,
      color: '#3b82f6',
      bgColor: '#eff6ff',
    },
    {
      title: 'Completed',
      value: stats.completedTasks,
      icon: <CheckCircle />,
      color: '#10b981',
      bgColor: '#f0fdf4',
    },
    {
      title: 'In Progress',
      value: stats.inProgressTasks,
      icon: <PlayArrow />,
      color: '#f59e0b',
      bgColor: '#fffbeb',
    },
    {
      title: 'Pending',
      value: stats.pendingTasks,
      icon: <Schedule />,
      color: '#ef4444',
      bgColor: '#fef2f2',
    },
  ];

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Navigation />
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Welcome Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
            Welcome back, {user?.firstName}! 👋
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            Here's what's happening with your tasks today
          </Typography>
          
          {/* Quick Actions */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/tasks')}
              sx={{
                background: 'linear-gradient(45deg, #2563eb 30%, #3b82f6 90%)',
                borderRadius: 2,
                px: 3,
                py: 1.5,
              }}
            >
              Create Task
            </Button>
            <Button
              variant="outlined"
              startIcon={<Visibility />}
              onClick={() => navigate('/tasks')}
              sx={{ borderRadius: 2, px: 3, py: 1.5 }}
            >
              View All Tasks
            </Button>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {statCards.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    transition: 'transform 0.2s ease-in-out',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {stat.title}
                      </Typography>
                      <Typography variant="h3" component="div" sx={{ fontWeight: 700, color: stat.color }}>
                        {loading ? '-' : stat.value}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: stat.bgColor,
                        color: stat.color,
                      }}
                    >
                      {stat.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Progress Section */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <TrendingUp sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                    Task Progress
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Overall Completion
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {completionRate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={completionRate}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        background: 'linear-gradient(45deg, #10b981 30%, #34d399 90%)',
                      },
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip
                    label={`${stats.completedTasks} Completed`}
                    sx={{ bgcolor: '#f0fdf4', color: '#10b981', fontWeight: 600 }}
                  />
                  <Chip
                    label={`${stats.inProgressTasks} In Progress`}
                    sx={{ bgcolor: '#fffbeb', color: '#f59e0b', fontWeight: 600 }}
                  />
                  <Chip
                    label={`${stats.pendingTasks} Pending`}
                    sx={{ bgcolor: '#fef2f2', color: '#ef4444', fontWeight: 600 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Assignment />}
                    onClick={() => navigate('/tasks')}
                    sx={{ justifyContent: 'flex-start', borderRadius: 2, py: 1.5 }}
                  >
                    Manage Tasks
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => navigate('/notifications')}
                    sx={{ justifyContent: 'flex-start', borderRadius: 2, py: 1.5 }}
                  >
                    View Notifications
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default Dashboard;
