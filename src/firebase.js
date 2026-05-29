// ============================================================
//  ÉTAPE 1 : Remplacez ces valeurs par celles de votre projet Firebase
//  Voir le fichier README.md pour les instructions
// ============================================================

import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDxPapYdDJFwfO-2kS8xGcZAmDyY_Eu6pE",
  authDomain: "mariage-meryem-hamza.firebaseapp.com",
  projectId: "mariage-meryem-hamza",
  storageBucket: "mariage-meryem-hamza.firebasestorage.app",
  messagingSenderId: "463870750117",
  appId: "1:463870750117:web:213584e7078215c3720c4c",
  measurementId: "G-YX4LWBKHLT"
};

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
