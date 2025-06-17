// src/components/RegisterForm.jsx
import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { checkEmail, checkUsername } from '../services/api';

export default function RegisterForm() {
  const { register } = useContext(AuthContext);

  const [form, setForm]         = useState({ username: '', email: '', password: '' });
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Generic change handler
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setErrors(errs => ({ ...errs, [name]: null, form: null }));
  };

  // Check username on blur
  const handleUsernameBlur = async () => {
    if (!form.username) return;
    try {
      const { exists } = await checkUsername(form.username);
      if (exists) {
        setErrors(errs => ({ ...errs, username: 'Username already taken.' }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Check email on blur
  const handleEmailBlur = async () => {
    if (!form.email) return;
    try {
      const { exists } = await checkEmail(form.email);
      if (exists) {
        setErrors(errs => ({ ...errs, email: 'Email already registered.' }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    // client-side required checks
    const newErrors = {};
    if (!form.username) newErrors.username = 'Username is required';
    if (!form.email)    newErrors.email    = 'Email is required';
    if (!form.password) newErrors.password = 'Password is required';

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      await register(form);  // now throws if duplicate
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.form && (
        <div className="p-2 bg-red-100 text-red-700 rounded">
          {errors.form}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium">Username</label>
        <input
          name="username"
          value={form.username}
          onChange={handleChange}
          onBlur={handleUsernameBlur}
          className="mt-1 w-full border rounded px-3 py-2"
        />
        {errors.username && (
          <p className="text-red-600 text-sm">{errors.username}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          name="email"
          value={form.email}
          onChange={handleChange}
          onBlur={handleEmailBlur}
          className="mt-1 w-full border rounded px-3 py-2"
        />
        {errors.email && (
          <p className="text-red-600 text-sm">{errors.email}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">Password</label>
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          className="mt-1 w-full border rounded px-3 py-2"
        />
        {errors.password && (
          <p className="text-red-600 text-sm">{errors.password}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={
          submitting ||
          Object.values(errors).some(Boolean)
        }
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
      >
        {submitting ? 'Registering…' : 'Register'}
      </button>
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
