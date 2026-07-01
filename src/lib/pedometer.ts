import { Capacitor } from '@capacitor/core';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';
import type { PluginListenerHandle } from '@capacitor/core';
import type { MeasurementEvent } from '@capgo/capacitor-pedometer';

export type StepCallback = (steps: number) => void;

class StepTracker {
  private stepThreshold = 12.5; 
  private minStepInterval = 350; 
  private lastStepTime = 0;
  
  private isTracking = false;
  private onStepDetected: StepCallback | null = null;
  private isNative = Capacitor.isNativePlatform();

  // Native pedometer variables
  private nativeListener: PluginListenerHandle | null = null;
  private lastNativeStepCount = 0;

  constructor() {
    this.handleMotion = this.handleMotion.bind(this);
  }

  // Set sensitivity threshold dynamically
  public setThreshold(threshold: number) {
    this.stepThreshold = threshold;
    console.log(`Pedometer threshold updated to: ${threshold}`);
  }

  // Permission Request
  async requestPermission(): Promise<boolean> {
    if (this.isNative) {
      try {
        const status = await CapacitorPedometer.checkPermissions();
        if (status.activityRecognition === 'granted') {
          return true;
        }
        const request = await CapacitorPedometer.requestPermissions();
        return request.activityRecognition === 'granted';
      } catch (error) {
        console.error('Error requesting native pedometer permission:', error);
        return false;
      }
    }

    // Web Motion Permission (iOS Safari)
    if (
      typeof window !== 'undefined' &&
      'DeviceMotionEvent' in window &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      try {
        const permissionState = await (DeviceMotionEvent as any).requestPermission();
        return permissionState === 'granted';
      } catch (error) {
        console.error('Error requesting Motion Permission:', error);
        return false;
      }
    }

    return true; 
  }

  // Start Tracking
  async start(callback: StepCallback) {
    if (this.isTracking) return;
    this.onStepDetected = callback;
    this.isTracking = true;

    if (this.isNative) {
      try {
        const available = await CapacitorPedometer.isAvailable();
        if (available.stepCounting) {
          this.lastNativeStepCount = 0;
          
          // Register listener with explicit MeasurementEvent type
          this.nativeListener = await CapacitorPedometer.addListener('measurement', (event: MeasurementEvent) => {
            const currentSteps = event.numberOfSteps || 0;
            if (this.lastNativeStepCount === 0) {
              this.lastNativeStepCount = currentSteps;
            } else if (currentSteps > this.lastNativeStepCount) {
              const delta = currentSteps - this.lastNativeStepCount;
              this.lastNativeStepCount = currentSteps;
              
              if (this.onStepDetected) {
                this.onStepDetected(delta);
              }
            }
          });

          await CapacitorPedometer.startMeasurementUpdates();
          console.log('Capacitor native pedometer tracking started!');
          return;
        } else {
          console.warn('Native step counting hardware is not available on this device.');
        }
      } catch (err) {
        console.error('Failed to start Capacitor native pedometer, switching to accelerometer:', err);
      }
    }

    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', this.handleMotion);
      console.log('Web sensor motion pedometer tracking started!');
    }
  }

  // Stop Tracking
  async stop() {
    if (!this.isTracking) return;
    this.isTracking = false;
    this.onStepDetected = null;

    if (this.isNative) {
      try {
        await CapacitorPedometer.stopMeasurementUpdates();
        if (this.nativeListener) {
          await this.nativeListener.remove();
          this.nativeListener = null;
        }
        console.log('Capacitor native pedometer tracking stopped.');
      } catch (err) {
        console.error('Failed to stop Capacitor native pedometer:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.handleMotion);
      console.log('Web sensor motion pedometer tracking stopped.');
    }
  }

  private handleMotion(event: DeviceMotionEvent) {
    const accel = event.accelerationIncludingGravity;
    if (!accel) return;

    const x = accel.x || 0;
    const y = accel.y || 0;
    const z = accel.z || 0;

    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const currentTime = Date.now();

    if (magnitude > this.stepThreshold) {
      if (currentTime - this.lastStepTime > this.minStepInterval) {
        this.lastStepTime = currentTime;
        
        if (this.onStepDetected) {
          this.onStepDetected(1);
        }
      }
    }
  }
}

export const pedometer = new StepTracker();
