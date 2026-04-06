// components/PrivateRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// This component checks if a user is authenticated.
// If not, it redirects them to the login page.
const PrivateRoute = ({ user }) => {
  // `user` will be passed as a prop from App.jsx
  if (!user) {
    // If there's no authenticated user, redirect to login
    return <Navigate to="/login" replace />;
  }

  // If there's a user, render the nested (protected) routes
  return <Outlet />;
};

export default PrivateRoute;
