// src/components/RegisterForm.jsx
import React, { useState, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { checkEmail, checkUsername } from "../services/api";

export default function RegisterForm() {
  const { register } = useContext(AuthContext);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [validationStatus, setValidationStatus] = useState({});

  // Password validation helper
  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return "Password must be at least 8 characters long";
    }
    if (!hasUpperCase || !hasLowerCase) {
      return "Password must contain both uppercase and lowercase letters";
    }
    if (!hasNumbers) {
      return "Password must contain at least one number";
    }
    if (!hasSpecialChar) {
      return "Password must contain at least one special character";
    }
    return null;
  };

  // Email validation helper
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return null;
  };

  // Username validation helper
  const validateUsername = (username) => {
    const minLength = 3;
    const maxLength = 20;
    const validChars = /^[a-zA-Z0-9_-]+$/;

    if (username.length < minLength) {
      return `Username must be at least ${minLength} characters long`;
    }
    if (username.length > maxLength) {
      return `Username must be no more than ${maxLength} characters long`;
    }
    if (!validChars.test(username)) {
      return "Username can only contain letters, numbers, hyphens, and underscores";
    }
    return null;
  };

  // Generic change handler with real-time validation
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));

    // Clear existing errors for this field
    setErrors((errs) => ({ ...errs, [name]: null, form: null }));

    // Real-time validation
    let fieldError = null;
    switch (name) {
      case "username":
        if (value) fieldError = validateUsername(value);
        break;
      case "email":
        if (value) fieldError = validateEmail(value);
        break;
      case "password":
        if (value) fieldError = validatePassword(value);
        // Also check confirm password if it exists
        if (form.confirmPassword && value !== form.confirmPassword) {
          setErrors((errs) => ({
            ...errs,
            confirmPassword: "Passwords do not match",
          }));
        } else if (form.confirmPassword && value === form.confirmPassword) {
          setErrors((errs) => ({ ...errs, confirmPassword: null }));
        }
        break;
      case "confirmPassword":
        if (value && value !== form.password) {
          fieldError = "Passwords do not match";
        }
        break;
    }

    if (fieldError) {
      setErrors((errs) => ({ ...errs, [name]: fieldError }));
    }
  };

  // Check username availability on blur
  const handleUsernameBlur = async () => {
    if (!form.username || errors.username) return;

    setValidationStatus((prev) => ({ ...prev, username: "checking" }));
    try {
      const { exists } = await checkUsername(form.username);
      if (exists) {
        setErrors((errs) => ({ ...errs, username: "Username already taken." }));
        setValidationStatus((prev) => ({ ...prev, username: "error" }));
      } else {
        setValidationStatus((prev) => ({ ...prev, username: "success" }));
      }
    } catch (e) {
      console.error("Username check failed:", e);
      setValidationStatus((prev) => ({ ...prev, username: "error" }));
    }
  };

  // Check email availability on blur
  const handleEmailBlur = async () => {
    if (!form.email || errors.email) return;

    setValidationStatus((prev) => ({ ...prev, email: "checking" }));
    try {
      const { exists } = await checkEmail(form.email);
      if (exists) {
        setErrors((errs) => ({ ...errs, email: "Email already registered." }));
        setValidationStatus((prev) => ({ ...prev, email: "error" }));
      } else {
        setValidationStatus((prev) => ({ ...prev, email: "success" }));
      }
    } catch (e) {
      console.error("Email check failed:", e);
      setValidationStatus((prev) => ({ ...prev, email: "error" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Comprehensive client-side validation
    const newErrors = {};

    if (!form.username) {
      newErrors.username = "Username is required";
    } else {
      const usernameError = validateUsername(form.username);
      if (usernameError) newErrors.username = usernameError;
    }

    if (!form.email) {
      newErrors.email = "Email is required";
    } else {
      const emailError = validateEmail(form.email);
      if (emailError) newErrors.email = emailError;
    }

    if (!form.password) {
      newErrors.password = "Password is required";
    } else {
      const passwordError = validatePassword(form.password);
      if (passwordError) newErrors.password = passwordError;
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      // Only send the necessary fields to the register function
      const { confirmPassword, ...registerData } = form;
      await register(registerData);
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to get input field styling based on validation state
  const getInputClassName = (fieldName) => {
    const baseClass = "mt-1 w-full border rounded px-3 py-2 transition-colors";
    const hasError = errors[fieldName];
    const isValidating = validationStatus[fieldName] === "checking";
    const isValid = validationStatus[fieldName] === "success" && !hasError;

    if (hasError) {
      return `${baseClass} border-red-300 focus:border-red-500 focus:ring-red-200`;
    } else if (isValid) {
      return `${baseClass} border-green-300 focus:border-green-500 focus:ring-green-200`;
    } else if (isValidating) {
      return `${baseClass} border-yellow-300 focus:border-yellow-500 focus:ring-yellow-200`;
    }
    return `${baseClass} border-gray-300 focus:border-blue-500 focus:ring-blue-200`;
  };

  // Check if form is valid for submission
  const isFormValid = () => {
    return (
      form.username &&
      form.email &&
      form.password &&
      form.confirmPassword &&
      !Object.values(errors).some(Boolean) &&
      form.password === form.confirmPassword
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.form && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
          <strong>Registration failed:</strong> {errors.form}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Username *
        </label>
        <div className="relative">
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            onBlur={handleUsernameBlur}
            className={getInputClassName("username")}
            placeholder="Choose a unique username"
            autoComplete="username"
          />
          {validationStatus.username === "checking" && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
            </div>
          )}
          {validationStatus.username === "success" && !errors.username && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
              ✓
            </div>
          )}
        </div>
        {errors.username && (
          <p className="text-red-600 text-sm mt-1">{errors.username}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address *
        </label>
        <div className="relative">
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            onBlur={handleEmailBlur}
            className={getInputClassName("email")}
            placeholder="you@example.com"
            autoComplete="email"
          />
          {validationStatus.email === "checking" && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
            </div>
          )}
          {validationStatus.email === "success" && !errors.email && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
              ✓
            </div>
          )}
        </div>
        {errors.email && (
          <p className="text-red-600 text-sm mt-1">{errors.email}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password *
        </label>
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          className={getInputClassName("password")}
          placeholder="Create a strong password"
          autoComplete="new-password"
        />
        {errors.password && (
          <p className="text-red-600 text-sm mt-1">{errors.password}</p>
        )}
        {form.password && !errors.password && (
          <p className="text-green-600 text-sm mt-1">
            Password meets requirements ✓
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Confirm Password *
        </label>
        <input
          name="confirmPassword"
          type="password"
          value={form.confirmPassword}
          onChange={handleChange}
          className={getInputClassName("confirmPassword")}
          placeholder="Confirm your password"
          autoComplete="new-password"
        />
        {errors.confirmPassword && (
          <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>
        )}
        {form.confirmPassword && form.password === form.confirmPassword && (
          <p className="text-green-600 text-sm mt-1">Passwords match ✓</p>
        )}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting || !isFormValid()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Registering...
            </span>
          ) : (
            "Create Account"
          )}
        </button>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>
          <strong>Password requirements:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>At least 8 characters long</li>
          <li>Contains uppercase and lowercase letters</li>
          <li>Contains at least one number</li>
          <li>Contains at least one special character</li>
        </ul>
      </div>
    </form>
  );
}

// import React, { useState, useContext } from 'react';
// import { AuthContext } from '../contexts/AuthContext';
// import { checkEmail, register as apiRegister } from '../services/api';

// export default function RegisterForm() {
//     const [username, setUsername] = useState('');
//   const [email, setEmail]       = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError]       = useState('');
//   const { register }            = useContext(AuthContext);

//   const handleSubmit = async e => {
//     e.preventDefault();
//     setError('');
//     try {
//       await register({ username, email, password });
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="space-y-4">
//       {error && (
//         <div className="p-2 bg-red-100 text-red-700 rounded">
//           {error}
//         </div>
//       )}
//       <div>
//         <label className="block text-sm font-medium text-gray-700">Username</label>
//         <input
//           className="mt-1 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-400"
//           placeholder="Choose a username"
//           value={username}
//           onChange={e => setUsername(e.target.value)}
//           required
//         />
//       </div>
//       <div>
//         <label className="block text-sm font-medium text-gray-700">Email</label>
//         <input
//           type="email"
//           className="mt-1 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-400"
//           placeholder="you@example.com"
//           value={email}
//           onChange={e => setEmail(e.target.value)}
//           required
//         />
//       </div>
//       <div>
//         <label className="block text-sm font-medium text-gray-700">Password</label>
//         <input
//           type="password"
//           className="mt-1 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-400"
//           placeholder="Create a password"
//           value={password}
//           onChange={e => setPassword(e.target.value)}
//           required
//         />
//       </div>
//       <button
//         type="submit"
//         className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
//       >
//         Register
//       </button>
//     </form>
//   );
// }
