"use client"

import React, { useState } from 'react';
import { LogIn, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setSubmitStatus('success');
      
      // Store tokens and user info in sessionStorage (not localStorage)
      if (data.tokens) {
        sessionStorage.setItem('accessToken', data.tokens.accessToken);
        sessionStorage.setItem('refreshToken', data.tokens.refreshToken);
        sessionStorage.setItem('idToken', data.tokens.idToken);
      }

      // Store user info
      if (data.user) {
        sessionStorage.setItem('userName', data.user.name);
        sessionStorage.setItem('userEmail', data.user.email);
      }
      
      // Redirect to dashboard after 1 second
      setTimeout(() => {
        router.push('/');
      }, 1000);
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
          <LogIn size={24} className="text-red-600 sm:w-7 sm:h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1">Sign In</h1>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Welcome back! Sign in to continue</p>
      </div>

      {/* Success Message */}
      {submitStatus === 'success' && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-center space-x-3">
          <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-200">Login successful!</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Redirecting to dashboard...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {submitStatus === 'error' && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-3">
          <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Login failed</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
              errors.email 
                ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950' 
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
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
              errors.password 
                ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950' 
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
            }`}
            placeholder="Enter your password"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password}</p>
          )}
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
              <span>Signing in...</span>
            </>
          ) : submitStatus === 'success' ? (
            <>
              <CheckCircle2 size={18} />
              <span>Signed in!</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>

        {/* Register Link */}
        <div className="text-center pt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            {onSwitchToRegister ? (
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
              >
                Create Account
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
              >
                Create Account
              </button>
            )}
          </p>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;

