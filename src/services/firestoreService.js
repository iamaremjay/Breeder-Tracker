import { db } from '../config/firebase'
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore'

// Save user profile to Firestore
export const saveUserProfile = async (userId, userData) => {
    try {
        await setDoc(doc(db, 'users', userId), {
            username: userData.username,
            email: userData.email,
            createdAt: new Date(),
            ...userData
        })

        await setDoc(doc(db, 'usernames', userData.username.toLowerCase()), {
            userId: userId,
            email: userData.email,
            createdAt: new Date()
        })

        return { success: true }
    } catch (error) {
        console.error('Error saving user profile:', error)

        try {
            await deleteDoc(doc(db, 'users', userId))
        } catch (cleanupError) {
            console.error('Error cleaning up after failed save:', cleanupError)
        }

        return { success: false, error: error.message }
    }
}

// Get user profile from Firestore
export const getUserProfile = async (userId) => {
    try {
        const docRef = doc(db, 'users', userId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
            return { success: true, data: docSnap.data() }
        } else {
            return { success: false, error: 'User profile not found' }
        }
    } catch (error) {
        console.error('Error getting user profile:', error)
        return { success: false, error: error.message }
    }
}

// Get user by username (for login)
export const getUserByUsername = async (username) => {
    try {
        const usernameDocRef = doc(db, 'usernames', username.toLowerCase())
        const usernameDoc = await getDoc(usernameDocRef)

        if (!usernameDoc.exists()) {
            return null
        }

        return usernameDoc.data()
    } catch (error) {
        console.error('Error getting user by username:', error)
        throw error
    }
}

// Check if username is available
export const checkUsernameAvailable = async (username) => {
    try {
        const usernameDocRef = doc(db, 'usernames', username.toLowerCase())
        const docSnap = await getDoc(usernameDocRef)
        return !docSnap.exists()
    } catch (error) {
        console.error('Error checking username:', error)
        return false
    }
}

// Save bloodline to Firestore - WITH DETAILED LOGGING
export const saveBloodline = async (userId, bloodlineData) => {
    console.log('📝 saveBloodline called');
    console.log('   userId:', userId);
    console.log('   wingbandNumber:', bloodlineData.wingbandNumber);
    console.log('   Full data:', bloodlineData);

    try {
        const docPath = `users/${userId}/bloodlines/${bloodlineData.wingbandNumber}`;
        console.log('📍 Document path:', docPath);

        const docRef = doc(db, 'users', userId, 'bloodlines', bloodlineData.wingbandNumber);
        console.log('📄 Document reference created');

        const dataToSave = {
            ...bloodlineData,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        console.log('💾 Data to save:', dataToSave);

        console.log('⏳ Calling setDoc...');
        await setDoc(docRef, dataToSave);
        console.log('✅ setDoc completed successfully!');

        return { success: true }
    } catch (error) {
        console.error('❌ Error saving bloodline:', error);
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);
        console.error('   Full error:', error);
        return { success: false, error: error.message }
    }
}

// Get all bloodlines for a user
export const getUserBloodlines = async (userId) => {
    try {
        const bloodlinesRef = collection(db, 'users', userId, 'bloodlines')
        const querySnapshot = await getDocs(bloodlinesRef)
        const bloodlines = []
        querySnapshot.forEach((doc) => {
            bloodlines.push({ id: doc.id, ...doc.data() })
        })
        return { success: true, data: bloodlines }
    } catch (error) {
        console.error('Error getting bloodlines:', error)
        return { success: false, error: error.message }
    }
}

// Get single bloodline
export const getBloodline = async (userId, wingbandNumber) => {
    try {
        const docRef = doc(db, 'users', userId, 'bloodlines', wingbandNumber)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
            return { success: true, data: docSnap.data() }
        } else {
            return { success: false, error: 'Bloodline not found' }
        }
    } catch (error) {
        console.error('Error getting bloodline:', error)
        return { success: false, error: error.message }
    }
}

// Delete bloodline
export const deleteBloodline = async (userId, wingbandNumber) => {
    try {
        await deleteDoc(doc(db, 'users', userId, 'bloodlines', wingbandNumber))
        return { success: true }
    } catch (error) {
        console.error('Error deleting bloodline:', error)
        return { success: false, error: error.message }
    }
}