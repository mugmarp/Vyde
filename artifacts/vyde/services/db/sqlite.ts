import { openDatabaseAsync } from 'expo-sqlite';

export const openLocalDatabase = () => openDatabaseAsync('vyde.db');
