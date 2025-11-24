"use client"

import React, { useState } from 'react';
import { UserPlus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  organization: string;
  role: string;
  description: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  organization?: string;
  role?: string;
}

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
    role: '',
    description: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.organization.trim()) {
      newErrors.organization = 'Organization is required';
    }

    if (!formData.role.trim()) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('idle');
    setErrorMessage('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          organization: formData.organization,
          role: formData.role,
          description: formData.description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSubmitStatus('success');
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-h-full overflow-y-auto p-6 sm:p-8">
      {/* Header */}
      <div className="text-center mb-6">  
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-red-50 dark:bg-red-950 rounded-full mb-3">
          <UserPlus size={24} className="text-red-600 sm:w-7 sm:h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1">Create Account</h1>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Register to start designing analog circuits</p>
      </div>

      {/* Success Message */}
      {submitStatus === 'success' && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-center space-x-3">
          <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-200">Registration successful!</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Redirecting to dashboard...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {submitStatus === 'error' && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-3">
          <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Registration failed</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-3 py-2 text-sm text-gray-700 dark:text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${
              errors.name ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
            }`}
            placeholder="Enter your full name"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email <span className="text-red-600">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-3 py-2 text-sm text-gray-700 dark:text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${
              errors.email ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
            }`}
            placeholder="Enter your email address"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password <span className="text-red-600">*</span>
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={`w-full px-3 py-2 text-sm text-gray-700 dark:text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${
              errors.password ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
            }`}
            placeholder="Enter your password (min 8 characters)"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Confirm Password <span className="text-red-600">*</span>
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`w-full px-3 py-2 text-sm text-gray-700 dark:text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${
              errors.confirmPassword ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
            }`}
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Organization */}
        <div>
          <label htmlFor="organization" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Organization <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="organization"
            name="organization"
            value={formData.organization}
            onChange={handleChange}
            className={`w-full px-3 py-2 text-sm text-gray-700 dark:text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${
              errors.organization ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
            }`}
            placeholder="Enter your organization"
          />
          {errors.organization && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.organization}</p>
          )}
        </div>

        {/* Role */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Role <span className="text-red-600">*</span>
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className={`w-full px-3 py-2 text-sm text-gray-700 dark:text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 ${
              errors.role ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950' : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            <option value="">Select your role</option>
            <option value="Design Engineer">Design Engineer</option>
            <option value="Senior Design Engineer">Senior Design Engineer</option>
            <option value="Principal Engineer">Principal Engineer</option>
            <option value="Engineering Manager">Engineering Manager</option>
            <option value="Researcher">Researcher</option>
            <option value="Student">Student</option>
            <option value="Other">Other</option>
          </select>
          {errors.role && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.role}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description <span className="text-gray-400 dark:text-gray-500 text-xs">(Optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 text-sm text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Tell us about yourself (optional)"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || submitStatus === 'success'}
          className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 dark:hover:bg-red-800 text-white text-sm font-medium rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Registering...</span>
            </>
          ) : submitStatus === 'success' ? (
            <>
              <CheckCircle2 size={18} />
              <span>Registered!</span>
            </>
          ) : (
            <span>Register</span>
          )}
        </button>

        {/* Login Link */}
        <div className="text-center pt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            {onSwitchToLogin ? (
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
              >
                Sign In
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
              >
                Sign In
              </button>
            )}
          </p>
        </div>
        </form>
    </div>
  );
};

export default RegisterForm;