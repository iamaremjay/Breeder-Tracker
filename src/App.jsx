import { useState, useEffect, useRef } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './config/firebase'
import LoginPage from './pages/LoginPage'
import BloodlineHistoryPage from './pages/BloodlineHistoryPage'
import BloodlineDetailsPage from './pages/BloodlineDetailsPage'
import BloodlineFormPage from './pages/BloodlineFormPage'
import SummaryPage from './pages/SummaryPage'

function App() {
    const [currentPage, setCurrentPage] = useState('history')
    const [selectedBloodline, setSelectedBloodline] = useState(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [user, setUser] = useState(null)
    const isSigningUp = useRef(false)

    // Monitor Firebase auth state
    useEffect(() => {
        // Set a timeout to prevent infinite loading
        const loadingTimeout = setTimeout(() => {
            if (isLoading) {
                console.log('Auth check timeout - showing login');
                setIsLoading(false);
                setIsAuthenticated(false);
            }
        }, 3000); // 3 second timeout

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            clearTimeout(loadingTimeout); // Clear timeout if auth resolves

            // Skip auth state change if user is in signup process
            if (isSigningUp.current) {
                return
            }

            if (currentUser) {
                console.log('✅ User authenticated:', currentUser.uid);
                setUser(currentUser)
                setIsAuthenticated(true)
                setCurrentPage('history')
            } else {
                console.log('❌ No user authenticated');
                setUser(null)
                setIsAuthenticated(false)
                setCurrentPage('login')
            }
            setIsLoading(false)
        }, (error) => {
            // Error callback for onAuthStateChanged
            console.error('Auth state error:', error);
            clearTimeout(loadingTimeout);
            setIsLoading(false);
            setIsAuthenticated(false);
        })

        return () => {
            clearTimeout(loadingTimeout);
            unsubscribe();
        }
    }, [])

    // Navigation function
    const navigate = (page, data = null) => {
        setCurrentPage(page)
        if (data) {
            setSelectedBloodline(data)
        } else {
            setSelectedBloodline(null)
        }
    }

    // Handle login
    const handleLogin = () => {
        // Firebase login will be handled in LoginPage component
        // The auth state change will trigger the effect above
    }

    // Handle signup start
    const handleSignupStart = () => {
        isSigningUp.current = true
    }

    // Handle signup complete
    const handleSignupComplete = () => {
        isSigningUp.current = false
        setIsLoading(false)
    }

    // Handle logout
    const handleLogout = () => {
        signOut(auth).then(() => {
            setIsAuthenticated(false)
            setCurrentPage('login')
            setSelectedBloodline(null)
        }).catch((error) => {
            console.error('Logout error:', error)
        })
    }

    // Render current page
    const renderPage = () => {
        // Show loading during initial auth check OR during signup
        if (isLoading || isSigningUp.current) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
                        <p className="text-white mt-4 font-semibold">
                            {isSigningUp.current ? 'Creating account...' : 'Loading...'}
                        </p>
                    </div>
                </div>
            )
        }

        if (!isAuthenticated) {
            return (
                <LoginPage
                    onLogin={handleLogin}
                    onSignupStart={handleSignupStart}
                    onSignupComplete={handleSignupComplete}
                />
            )
        }

        switch (currentPage) {
            case 'history':
                return (
                    <BloodlineHistoryPage
                        userId={user?.uid}
                        navigate={navigate}
                        onViewDetails={(bloodline) => navigate('details', bloodline)}
                        onAddNew={() => navigate('form')}
                        onSummary={() => navigate('summary')}
                        onLogout={handleLogout}
                    />
                )
            case 'details':
                return (
                    <BloodlineDetailsPage
                        userId={user?.uid}
                        bloodline={selectedBloodline}
                        onBack={() => navigate('history')}
                        onEdit={(bloodline) => navigate('form', bloodline)}
                        onLogout={handleLogout}
                    />
                )
            case 'form':
                return (
                    <BloodlineFormPage
                        userId={user?.uid}
                        bloodline={selectedBloodline}
                        onBack={() => {
                            const isEditing = selectedBloodline !== null;
                            const bloodlineData = selectedBloodline;
                            setSelectedBloodline(null);
                            navigate(isEditing ? 'details' : 'history', isEditing ? bloodlineData : null);
                        }}
                        onSave={(savedBloodline) => {
                            setSelectedBloodline(null)
                            navigate('history')
                        }}
                        onLogout={handleLogout}
                    />
                )
            case 'summary':
                return (
                    <SummaryPage
                        userId={user?.uid}
                        onBack={() => navigate('history')}
                        onLogout={handleLogout}
                    />
                )
            default:
                return (
                    <BloodlineHistoryPage
                        userId={user?.uid}
                        navigate={navigate}
                        onViewDetails={(bloodline) => navigate('details', bloodline)}
                        onAddNew={() => navigate('form')}
                        onSummary={() => navigate('summary')}
                        onLogout={handleLogout}
                    />
                )
        }
    }

    return (
        <div className="App">
            {renderPage()}
        </div>
    )
}

export default App