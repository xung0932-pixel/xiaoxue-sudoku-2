import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocs, collection, setDoc, updateDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export interface PlayerData {
  userId: string;
  displayName: string;
  photoURL?: string;
  unlockedLevel: number;
  totalStars: number;
  cultivationRealm: string;
  levelRecords: Record<string, { stars: number; bestTime: number; completed: boolean }>;
}

const LOCAL_STORAGE_KEY = 'xiaoxue_sudoku_player_data';

export function getLocalFallbackData(): PlayerData {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {
    userId: 'guest_daoist',
    displayName: '無名散修',
    unlockedLevel: 1,
    totalStars: 0,
    cultivationRealm: '煉氣初期',
    levelRecords: {},
  };
}

export function saveLocalFallbackData(data: PlayerData) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// Load player data from Firestore
export async function loadUserData(user: User): Promise<PlayerData> {
  const userRef = doc(db, 'users', user.uid);
  const progressColRef = collection(db, 'users', user.uid, 'levelProgress');
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const levelRecords: Record<string, { stars: number; bestTime: number; completed: boolean }> = {};
      try {
        const progressSnap = await getDocs(progressColRef);
        progressSnap.forEach(docSnap => {
          const p = docSnap.data();
          const lvlKey = String(p.levelId ?? docSnap.id);
          levelRecords[lvlKey] = {
            stars: Number(p.stars || 0),
            bestTime: Number(p.bestTimeSeconds ?? p.bestTime ?? 0),
            completed: Boolean(p.completed),
          };
        });
      } catch (subErr) {
        handleFirestoreError(subErr, OperationType.LIST, `users/${user.uid}/levelProgress`);
      }

      const loaded: PlayerData = {
        userId: user.uid,
        displayName: data.displayName || user.displayName || '無名散修',
        photoURL: data.photoURL || user.photoURL || undefined,
        unlockedLevel: data.unlockedLevel || 1,
        totalStars: data.totalStars || 0,
        cultivationRealm: data.cultivationRealm || '煉氣初期',
        levelRecords,
      };
      saveLocalFallbackData(loaded);
      return loaded;
    } else {
      // Initialize new cultivator profile
      const localData = getLocalFallbackData();
      const safeDisplayName = (user.displayName || '無名散修').slice(0, 64);
      const safePhotoURL = (user.photoURL || '').slice(0, 512);
      const initialProfile: PlayerData = {
        userId: user.uid,
        displayName: safeDisplayName,
        photoURL: safePhotoURL || undefined,
        unlockedLevel: Math.max(1, localData.unlockedLevel || 1),
        totalStars: localData.totalStars || 0,
        cultivationRealm: (localData.cultivationRealm || '煉氣初期').slice(0, 64),
        levelRecords: localData.levelRecords || {},
      };

      await setDoc(userRef, {
        userId: initialProfile.userId,
        displayName: initialProfile.displayName,
        photoURL: safePhotoURL,
        unlockedLevel: initialProfile.unlockedLevel,
        totalStars: initialProfile.totalStars,
        cultivationRealm: initialProfile.cultivationRealm,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Sync any local guest progress to levelProgress subcollection
      const entries = Object.entries(initialProfile.levelRecords);
      for (const [lvlKey, rec] of entries) {
        const levelIdNum = Number(lvlKey);
        if (!Number.isFinite(levelIdNum) || levelIdNum < 1) continue;
        const levelDoc = doc(db, 'users', user.uid, 'levelProgress', String(levelIdNum));
        await setDoc(levelDoc, {
          userId: user.uid,
          levelId: levelIdNum,
          stars: Math.min(3, Math.max(0, Number(rec.stars || 0))),
          bestTimeSeconds: Math.max(0, Number(rec.bestTime || 0)),
          completed: Boolean(rec.completed),
          updatedAt: new Date().toISOString(),
        });
      }

      return initialProfile;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
  }
}

// Sync completed level and stars
export async function syncLevelCompletion(
  user: User | null,
  currentData: PlayerData,
  levelId: number,
  stars: number,
  timeSeconds: number,
  allLevelsCount: number = 12
): Promise<PlayerData> {
  const existingRecord = currentData.levelRecords[levelId.toString()];
  const previousStars = existingRecord?.stars || 0;
  const bestTime = existingRecord ? Math.min(existingRecord.bestTime, timeSeconds) : timeSeconds;
  const newStars = Math.max(previousStars, stars);
  const additionalStars = Math.max(0, newStars - previousStars);

  const updatedRecords = {
    ...currentData.levelRecords,
    [levelId.toString()]: {
      stars: newStars,
      bestTime,
      completed: true,
    },
  };

  const nextUnlocked = Math.min(allLevelsCount, Math.max(currentData.unlockedLevel, levelId + 1));
  const newTotalStars = currentData.totalStars + additionalStars;

  let realm = '煉氣初期';
  if (nextUnlocked >= 12) realm = '大乘飛昇';
  else if (nextUnlocked >= 11) realm = '化神尊者';
  else if (nextUnlocked >= 9) realm = '元嬰至境';
  else if (nextUnlocked >= 7) realm = '金丹大道';
  else if (nextUnlocked >= 5) realm = '築基中期';
  else if (nextUnlocked >= 3) realm = '煉氣圓滿';

  const updatedPlayer: PlayerData = {
    ...currentData,
    unlockedLevel: nextUnlocked,
    totalStars: newTotalStars,
    cultivationRealm: realm,
    levelRecords: updatedRecords,
  };

  saveLocalFallbackData(updatedPlayer);

  if (user) {
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        unlockedLevel: updatedPlayer.unlockedLevel,
        totalStars: updatedPlayer.totalStars,
        cultivationRealm: updatedPlayer.cultivationRealm,
        updatedAt: new Date().toISOString(),
      });

      // Also record to subcollection
      const levelDoc = doc(db, 'users', user.uid, 'levelProgress', levelId.toString());
      await setDoc(levelDoc, {
        userId: user.uid,
        levelId,
        stars: newStars,
        bestTimeSeconds: bestTime,
        completed: true,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/levelProgress/${levelId}`);
    }
  }

  return updatedPlayer;
}

export { onAuthStateChanged, signInWithPopup, signOut };
