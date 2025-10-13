import { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../config/firebase'
import { saveUserProfile, checkUsernameAvailable, getUserByUsername } from '../services/firestoreService'

function LoginPage({ onLogin, onSignupStart, onSignupComplete }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            // Validation
            if (!username || !password) {
                setError('Please enter both username and password')
                setIsLoading(false)
                return
            }

            if (username.length < 3) {
                setError('Username must be at least 3 characters')
                setIsLoading(false)
                return
            }

            if (isSignUp) {
                // Sign Up Flow
                if (!email) {
                    setError('Please enter an email address')
                    setIsLoading(false)
                    return
                }

                if (password.length < 6) {
                    setError('Password must be at least 6 characters')
                    setIsLoading(false)
                    return
                }

                if (password !== confirmPassword) {
                    setError('Passwords do not match')
                    setIsLoading(false)
                    return
                }

                // Check username availability
                const usernameAvailable = await checkUsernameAvailable(username)
                if (!usernameAvailable) {
                    setError('Username is already taken')
                    setIsLoading(false)
                    return
                }

                // Notify App.js that signup is starting
                if (onSignupStart) {
                    onSignupStart()
                }

                // Create Firebase Auth account
                const userCredential = await createUserWithEmailAndPassword(auth, email, password)

                // Save user profile to Firestore
                const saveResult = await saveUserProfile(userCredential.user.uid, {
                    username: username,
                    email: email
                })

                if (!saveResult.success) {
                    if (onSignupComplete) {
                        onSignupComplete()
                    }
                    setError('Account created but profile save failed: ' + saveResult.error)
                    setIsLoading(false)
                    return
                }

                // Sign out user immediately after signup
                await auth.signOut()

                // Notify App.js that signup is complete
                if (onSignupComplete) {
                    onSignupComplete()
                }

                // Reset form and switch to login
                setIsSignUp(false)
                setUsername('')
                setPassword('')
                setConfirmPassword('')
                setEmail('')
                setError('')
                alert('Account created successfully! Please log in with your username and password.')

            } else {
                // Login Flow
                const userDoc = await getUserByUsername(username)

                if (!userDoc || !userDoc.email) {
                    setError('Username not found. Please check your username or sign up.')
                    setIsLoading(false)
                    return
                }

                // Sign in with email and password
                await signInWithEmailAndPassword(auth, userDoc.email, password)

                // onAuthStateChanged in App.js will handle redirect
                if (onLogin) {
                    onLogin()
                }
            }
        } catch (err) {
            console.error('Authentication error:', err)

            // Handle specific Firebase errors
            if (err.code === 'auth/email-already-in-use') {
                setError('Email is already registered. Please sign in instead.')
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak. Use at least 6 characters.')
            } else if (err.code === 'auth/wrong-password') {
                setError('Incorrect password. Please try again.')
            } else if (err.code === 'auth/invalid-email') {
                setError('Invalid email address.')
            } else if (err.code === 'auth/user-not-found') {
                setError('User not found. Please check your credentials.')
            } else if (err.code === 'auth/invalid-credential') {
                setError('Invalid credentials. Please check your username and password.')
            } else {
                setError(err.message || 'Authentication failed. Please try again.')
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleToggleMode = () => {
        setIsSignUp(!isSignUp)
        setError('')
        setPassword('')
        setConfirmPassword('')
        setEmail('')
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !isLoading) {
            handleLogin(e)
        }
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 relative overflow-hidden p-4">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 sm:p-10">
                    {/* Logo/Brand */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-lg mb-4 shadow-lg">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Welcome Back</h1>
                        <p className="text-white/70 text-sm">
                            {isSignUp ? 'Create your account' : 'Sign in to continue'}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-white px-4 py-3 rounded-xl text-sm font-medium">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    {error}
                                </div>
                            </div>
                        )}

                        {/* Username Field */}
                        <div className="space-y-2">
                            <label htmlFor="username" className="block text-white text-sm font-semibold">
                                Username
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all disabled:opacity-50"
                                    placeholder={isSignUp ? 'Choose a username (min 3 chars)' : 'Enter your username'}
                                    disabled={isLoading}
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Email Field (Sign Up Only) */}
                        {isSignUp && (
                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-white text-sm font-semibold">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        className="w-full pl-12 pr-4 py-3.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all disabled:opacity-50"
                                        placeholder="Enter your email"
                                        disabled={isLoading}
                                        autoComplete="email"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-white text-sm font-semibold">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all disabled:opacity-50"
                                    placeholder={isSignUp ? 'Create a password (min 6 chars)' : 'Enter your password'}
                                    disabled={isLoading}
                                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                />
                            </div>
                        </div>

                        {/* Confirm Password Field (Sign Up Only) */}
                        {isSignUp && (
                            <div className="space-y-2">
                                <label htmlFor="confirmPassword" className="block text-white text-sm font-semibold">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        className="w-full pl-12 pr-4 py-3.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all disabled:opacity-50"
                                        placeholder="Re-enter your password"
                                        disabled={isLoading}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-pink-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                        </button>

                        {/* Toggle Sign Up/Sign In */}
                        <div className="text-center">
                            <p className="text-white/70 text-sm">
                                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                                {' '}
                                <button
                                    type="button"
                                    onClick={handleToggleMode}
                                    disabled={isLoading}
                                    className="text-white font-semibold hover:text-white/80 transition-colors disabled:opacity-50"
                                >
                                    {isSignUp ? 'Sign In' : 'Sign Up'}
                                </button>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default LoginPage