import React from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import LoginForm from '../components/LoginForm';

export default function LoginPage() {
  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-center mb-6">Welcome Back</h1>
      <LoginForm />
      <p className="text-center text-sm text-gray-600 mt-4">
        Don’t have an account?{' '}
        <Link to="/register" className="text-blue-600 hover:underline">
          Register now
        </Link>
      </p>
    </AuthLayout>
  );
}
