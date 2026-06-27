import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, setPersistence, browserLocalPersistence } from 'firebase/auth';
import defaultFirebaseConfig from '../../firebase-applet-config.json';
import { getFirestore } from 'firebase/firestore';

// Resolve customized or default firebase configuration pointers dynamically
export const getActiveFirebaseConfig = () => {
  if (typeof window !== 'undefined') {
    const custom = window.localStorage.getItem('custom_firebase_config');
    if (custom) {
      try {
        const parsed = JSON.parse(custom);
        if (parsed && parsed.apiKey && parsed.projectId) {
          return {
            ...defaultFirebaseConfig,
            ...parsed
          };
        }
      } catch (e) {
        console.error('Failed to parse custom_firebase_config from localStorage:', e);
      }
    }
  }
  return defaultFirebaseConfig;
};

export const firebaseConfig = getActiveFirebaseConfig();

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const provider = new GoogleAuthProvider();
// Request Google Drive File upload & access scope
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== 'undefined' ? sessionStorage.getItem('acoola_drive_token') : null;

// Hook or listener for auth state change
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        cachedAccessToken = sessionStorage.getItem('acoola_drive_token');
      }
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        if (onAuthSuccess) onAuthSuccess(user, '');
      }
    } else {
      cachedAccessToken = null;
      sessionStorage.removeItem('acoola_drive_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    // Set persistence to local state: survives browser restart
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive access token from authentication.');
    }
    cachedAccessToken = credential.accessToken;
    sessionStorage.setItem('acoola_drive_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const googleSignOut = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  sessionStorage.removeItem('acoola_drive_token');
};

// --- Google Drive Backup / Restore Logic ---
const BACKUP_FILENAME = 'acoola_trims_erp_backup.json';

export interface ERPBackupData {
  bookings: any[];
  pis: any[];
  challans: any[];
  banks: any[];
  suppliers: any[];
  workOrders: any[];
  payments: any[];
  conveyances?: any[];
  manualBills?: any[];
  jobCards?: any[];
  commercialInvoices?: any[];
  products?: any[];
  updatedAt: string;
}

export const findBackupFile = async (token: string): Promise<{ id: string; modifiedTime: string } | null> => {
  try {
    const query = encodeURIComponent(`name = '${BACKUP_FILENAME}' and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&spaces=drive`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      if (data.files && data.files.length > 0) {
        return {
          id: data.files[0].id,
          modifiedTime: data.files[0].modifiedTime
        };
      }
      return null;
    } else {
      if (response.status === 401) {
        sessionStorage.removeItem('acoola_drive_token');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('acoola_drive_token_expired'));
        }
      }
      throw new Error(`Failed searching backup file: ${response.status} ${response.statusText || 'Unauthorized'}`);
    }
  } catch (err) {
    console.error('findBackupFile error:', err);
    throw err;
  }
};

export const uploadBackupFileToDrive = async (token: string, backupData: ERPBackupData): Promise<string> => {
  try {
    // 1. Check if backup file already exists
    const existingFile = await findBackupFile(token);
    let fileId = existingFile?.id;

    if (!fileId) {
      // 2. Create the metadata first
      const metadataUrl = 'https://www.googleapis.com/drive/v3/files';
      const metadataResponse = await fetch(metadataUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: BACKUP_FILENAME,
          mimeType: 'application/json'
        })
      });

      if (!metadataResponse.ok) {
        if (metadataResponse.status === 401) {
          sessionStorage.removeItem('acoola_drive_token');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('acoola_drive_token_expired'));
          }
        }
        throw new Error(`Failed creating file metadata: ${metadataResponse.status} ${metadataResponse.statusText || 'Unauthorized'}`);
      }
      const metadata = await metadataResponse.json();
      fileId = metadata.id;
    }

    if (!fileId) {
      throw new Error('Could not resolve Google Drive File ID');
    }

    // 3. Upload content to Drive
    const contentUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const uploadResponse = await fetch(contentUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(backupData)
    });

    if (!uploadResponse.ok) {
      if (uploadResponse.status === 401) {
        sessionStorage.removeItem('acoola_drive_token');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('acoola_drive_token_expired'));
        }
      }
      throw new Error(`Failed uploading file content to Drive: ${uploadResponse.status} ${uploadResponse.statusText || 'Unauthorized'}`);
    }

    return fileId;
  } catch (err) {
    console.error('uploadBackupFileToDrive error:', err);
    throw err;
  }
};

export const downloadBackupFileFromDrive = async (token: string, fileId: string): Promise<ERPBackupData> => {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        sessionStorage.removeItem('acoola_drive_token');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('acoola_drive_token_expired'));
        }
      }
      throw new Error(`Failed downloading file from Drive: ${response.status} ${response.statusText || 'Unauthorized'}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('downloadBackupFileFromDrive error:', err);
    throw err;
  }
};
