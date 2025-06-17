import React from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import RegisterForm from '../components/RegisterForm';

export default function RegisterPage() {
  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-center mb-6">Get Started</h1>
      <RegisterForm />
      <p className="text-center text-sm text-gray-600 mt-4">
        Already have an account?{' '}
        <Link to="/" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
