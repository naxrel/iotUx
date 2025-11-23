// Command Queue untuk offline command storage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deviceAPI } from '../services/api';

export interface QueuedCommand {
  id: string;
  deviceId: string;
  command: string;
  value?: string;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'sending' | 'failed' | 'success';
}

const QUEUE_KEY = '@command_queue';
const MAX_RETRIES = 3;
const SAVE_DEBOUNCE_MS = 500; // Debounce storage writes

export class CommandQueue {
  private static queue: QueuedCommand[] = [];
  private static processing = false;
  private static saveTimeout: NodeJS.Timeout | null = null;

  static async init() {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`📦 Loaded ${this.queue.length} queued commands`);
      }
    } catch (error) {
      console.error('Failed to load command queue:', error);
    }
  }

  static async addCommand(deviceId: string, command: string, value?: string): Promise<string> {
    const queuedCommand: QueuedCommand = {
      id: `${Date.now()}-${Math.random()}`,
      deviceId,
      command,
      value,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    this.queue.push(queuedCommand);
    await this.saveQueue();
    
    console.log(`✅ Command queued: ${command} for device ${deviceId}`);
    
    // Try to process immediately if online
    this.processQueue();
    
    return queuedCommand.id;
  }

  static async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    const pendingCommands = this.queue.filter(
      cmd => cmd.status === 'pending' || cmd.status === 'failed'
    );

    for (const cmd of pendingCommands) {
      if (cmd.retryCount >= MAX_RETRIES) {
        console.log(`❌ Command ${cmd.id} exceeded max retries, removing`);
        this.queue = this.queue.filter(c => c.id !== cmd.id);
        continue;
      }

      try {
        cmd.status = 'sending';
        cmd.retryCount++;
        await this.saveQueue();

        await deviceAPI.sendCommand(cmd.deviceId, cmd.command, cmd.value);
        
        console.log(`✅ Command ${cmd.command} sent successfully`);
        
        // Remove from queue on success
        this.queue = this.queue.filter(c => c.id !== cmd.id);
        await this.saveQueue();
        
      } catch (error) {
        console.error(`Failed to send command ${cmd.id}:`, error);
        cmd.status = 'failed';
        await this.saveQueue();
      }
    }

    this.processing = false;

    // Save final state
    await this.saveQueue();
  }

  static async clearQueue() {
    this.queue = [];
    // Clear any pending save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    // Use immediate save to ensure clearing is persisted
    await this.saveQueueImmediate();
  }

  static getPendingCount(): number {
    return this.queue.filter(
      cmd => cmd.status === 'pending' || cmd.status === 'failed'
    ).length;
  }

  static getQueuedCommands(): QueuedCommand[] {
    return [...this.queue];
  }

  private static async saveQueue() {
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // Debounce the save operation
    this.saveTimeout = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
        this.saveTimeout = null;
      } catch (error) {
        console.error('Failed to save command queue:', error);
      }
    }, SAVE_DEBOUNCE_MS);
  }
  
  // Force immediate save (use for critical operations)
  private static async saveQueueImmediate() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save command queue:', error);
    }
  }
}
