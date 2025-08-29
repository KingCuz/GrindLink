// --- File: src/App.tsx ---
// This file orchestrates the entire application with real-time updates.

import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';

// Define the type for an assignment object to ensure type safety
interface Assignment {
  id: string; // ID is now a string from Firestore
  gig_id: number;
  assignee_id: number;
  due_date: string;
  status: string;
  created_at: string;
}

// Define the type for a user profile object
interface UserProfile {
  id: string;
  username: string;
  bio: string;
  skills: string[];
  created_at: string;
}

// -----------------------------------------------------------------------------
// AssignmentForm Component - Handles adding new assignments via the API
// -----------------------------------------------------------------------------
function AssignmentForm() {
  const [gigId, setGigId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('in_progress');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!gigId || !assigneeId || !dueDate || !status) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gig_id: parseInt(gigId, 10),
          assignee_id: parseInt(assigneeId, 10),
          due_date: dueDate,
          status: status,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add assignment.');
      }

      setSuccessMessage('Assignment created successfully!');
      setGigId('');
      setAssigneeId('');
      setDueDate('');
      setStatus('in_progress');
    } catch (err: any) {
      console.error('Error inserting assignment:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-center mb-4 text-gray-800">Add New Assignment</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-500 text-center text-sm">{error}</p>}
        {successMessage && <p className="text-green-500 text-center text-sm">{successMessage}</p>}
        <div>
          <label htmlFor="gigId" className="block text-gray-700 font-medium">Gig ID</label>
          <input 
            type="number" 
            id="gigId" 
            value={gigId}
            onChange={(e) => setGigId(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
            required 
          />
        </div>
        <div>
          <label htmlFor="assigneeId" className="block text-gray-700 font-medium">Assignee ID</label>
          <input 
            type="number" 
            id="assigneeId" 
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
            required 
          />
        </div>
        <div>
          <label htmlFor="dueDate" className="block text-gray-700 font-medium">Due Date</label>
          <input 
            type="date" 
            id="dueDate" 
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
            required 
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-gray-700 font-medium">Status</label>
          <select 
            id="status" 
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
            required
          >
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <button 
          type="submit" 
          className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors"
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Assignment'}
        </button>
      </form>
    </div>
  );
}

// -----------------------------------------------------------------------------
// AssignmentsList Component - Fetches and displays assignments in real-time
// -----------------------------------------------------------------------------
function AssignmentsList() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchAssignments = useCallback(async () => {
    try {
      const response = await fetch('/api/assignments');
      if (!response.ok) throw new Error('Failed to fetch assignments from API.');
      const data = await response.json();
      setAssignments(data);
    } catch (err: any) {
      console.error('Error fetching assignments:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
    const socket = io();
    socket.on('new_assignment', (newAssignment: Assignment) => {
      setAssignments(currentAssignments => [newAssignment, ...currentAssignments]);
    });
    return () => { socket.disconnect(); };
  }, [fetchAssignments]);

  if (loading) return <div className="p-6 text-center text-gray-500">Loading assignments...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-center mb-4 text-gray-800">Assignments</h2>
      <div className="space-y-4">
        {assignments.length === 0 ? (
          <p className="text-center text-gray-500">No assignments found.</p>
        ) : (
          assignments.map((assignment) => (
            <div 
              key={assignment.id} 
              className="p-4 border border-gray-200 rounded-lg shadow-sm bg-gray-50 hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900">{`Gig ID: ${assignment.gig_id}`}</h3>
              <p className="text-gray-600">Status: {assignment.status}</p>
              <p className="text-gray-600">Due: {new Date(assignment.due_date).toLocaleDateString()}</p>
              <p className="text-gray-600">Assignee ID: {assignment.assignee_id}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// UserProfileForm Component - Handles adding new user profiles via the API
// -----------------------------------------------------------------------------
function UserProfileForm() {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!username) {
      setError('Username is required.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          bio,
          skills: skills.split(',').map(s => s.trim()), // Convert comma-separated string to an array
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user profile.');
      }

      setSuccessMessage('User profile created successfully!');
      setUsername('');
      setBio('');
      setSkills('');
    } catch (err: any) {
      console.error('Error creating user profile:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-center mb-4 text-gray-800">Create User Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-500 text-center text-sm">{error}</p>}
        {successMessage && <p className="text-green-500 text-center text-sm">{successMessage}</p>}
        <div>
          <label htmlFor="username" className="block text-gray-700 font-medium">Username</label>
          <input 
            type="text" 
            id="username" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
            required 
          />
        </div>
        <div>
          <label htmlFor="bio" className="block text-gray-700 font-medium">Bio</label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="skills" className="block text-gray-700 font-medium">Skills (comma-separated)</label>
          <input
            type="text"
            id="skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <button 
          type="submit" 
          className="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 transition-colors"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Profile'}
        </button>
      </form>
    </div>
  );
}

// -----------------------------------------------------------------------------
// UserProfilesList Component - Fetches and displays user profiles in real-time
// -----------------------------------------------------------------------------
function UserProfilesList() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch user profiles from API.');
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      console.error('Error fetching users:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    const socket = io();
    socket.on('new_user', (newUser: UserProfile) => {
      setUsers(currentUsers => [newUser, ...currentUsers]);
    });
    return () => { socket.disconnect(); };
  }, [fetchUsers]);

  if (loading) return <div className="p-6 text-center text-gray-500">Loading user profiles...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-center mb-4 text-gray-800">User Profiles</h2>
      <div className="space-y-4">
        {users.length === 0 ? (
          <p className="text-center text-gray-500">No user profiles found.</p>
        ) : (
          users.map((user) => (
            <div 
              key={user.id} 
              className="p-4 border border-gray-200 rounded-lg shadow-sm bg-gray-50 hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900">{user.username}</h3>
              <p className="text-sm text-gray-600">
                <span className="font-medium">ID:</span> {user.id}
              </p>
              <p className="text-gray-600">{user.bio}</p>
              <p className="text-sm text-gray-600 font-medium">Skills:</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {user.skills.map((skill, index) => (
                  <span key={index} className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// App Component - Renders all sections in a single layout
// -----------------------------------------------------------------------------
export default function App() {
  return (
    <div className="bg-gray-50 min-h-screen p-8 font-sans">
      <h1 className="text-4xl font-extrabold text-center text-blue-800 mb-8">GrindLink Hub</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {/* Assignments Section */}
        <div className="md:col-span-1">
          <AssignmentForm />
          <div className="mt-8">
            <AssignmentsList />
          </div>
        </div>
        {/* User Profiles Section */}
        <div className="md:col-span-1">
          <UserProfileForm />
          <div className="mt-8">
            <UserProfilesList />
          </div>
        </div>
        {/* Placeholder for future features */}
        <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md flex items-center justify-center">
          <p className="text-center text-gray-500 italic">
            Your "Hustle Content Feed" and other features will go here!
          </p>
        </div>
      </div>
    </div>
  );
}
