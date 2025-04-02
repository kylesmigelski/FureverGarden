// src/app/components/clouds/clouds.component.ts
import { Component, OnInit, Input, ChangeDetectionStrategy } from '@angular/core';

// --- Interfaces (Moved from CanvasComponent) ---
interface CloudPuff {
  sizeRatio: number; // % of parent cloud's base size
  topPerc: number;   // % offset relative to parent top
  leftPerc: number;  // % offset relative to parent left
}

interface Cloud {
  id: string;
  top: number;     // Calculated vertical position (px)
  baseSize: number; // Base size (used for width/height calcs)
  height: number;  // Actual calculated height (px)
  opacity: number;
  duration: number;
  delay: number;
  zIndex: number;
  puffs: CloudPuff[]; // Array of puff configurations
}

@Component({
  selector: 'app-clouds',
  templateUrl: './clouds.component.html',
  styleUrls: ['./clouds.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush // Keep OnPush
})
export class CloudsComponent implements OnInit {

  // --- Inputs (Needed from Parent) ---
  @Input() spaceLimit: number = 0; // Default or mark as required
  @Input() skyLimit: number = 0;   // Default or mark as required

  // --- Cloud Configuration (Moved from CanvasComponent) ---
  readonly numberOfClouds = 25;
  readonly cloudMinBaseSize = 80;
  readonly cloudMaxBaseSize = 300;
  readonly cloudBaseHeightRatio = 0.6;
  readonly cloudMinPuffs = 2;
  readonly cloudMaxPuffs = 5;
  readonly puffMinSizeRatio = 0.4;
  readonly puffMaxSizeRatio = 0.9;
  readonly cloudMinOpacity = 0.3;
  readonly cloudMaxOpacity = 0.9;
  readonly cloudMinDuration = 20;
  readonly cloudMaxDuration = 80;
  readonly cloudBaseZIndex = 1; // Base z-index for clouds

  cloudLayers: Cloud[] = [];

  constructor() { } // Inject services if needed later

  ngOnInit(): void {
    // Generate clouds when the component initializes
    this.createClouds();
  }

  // --- Cloud Generation Logic ---
  createClouds(): void {
    const clouds: Cloud[] = [];
    const skyZoneStartY = this.spaceLimit;
    const skyZoneEndY = this.skyLimit;

    // Basic validation for limits
    if (skyZoneStartY >= skyZoneEndY) {
      console.error("CloudsComponent: spaceLimit must be less than skyLimit.");
      return;
    }

    console.log(`CloudsComponent: Generating clouds between ${skyZoneStartY}px and ${skyZoneEndY}px`);

    for (let i = 0; i < this.numberOfClouds; i++) {
      const baseSize = this.randomRange(this.cloudMinBaseSize, this.cloudMaxBaseSize);
      const height = baseSize * this.cloudBaseHeightRatio;
      const duration = this.randomRange(this.cloudMinDuration, this.cloudMaxDuration);

      const maxPossibleTop = skyZoneEndY - height;
      const minPossibleTop = skyZoneStartY;

      if (minPossibleTop >= maxPossibleTop) {
        console.warn(`CloudsComponent: Cloud ${i} skipped: Too tall (${height}px) for available sky zone height (${skyZoneEndY - skyZoneStartY}px).`);
        continue;
      }

      const top = this.randomRange(minPossibleTop, maxPossibleTop);

      const puffs: CloudPuff[] = [];
      const numPuffs = Math.floor(this.randomRange(this.cloudMinPuffs, this.cloudMaxPuffs + 1));
      for (let p = 0; p < numPuffs; p++) {
        puffs.push({
          sizeRatio: this.randomRange(this.puffMinSizeRatio, this.puffMaxSizeRatio),
          topPerc: this.randomRange(-25, 50),
          leftPerc: this.randomRange(-20, 60),
        });
      }

      clouds.push({
        id: `cloud-${i}`,
        top: top,
        baseSize: baseSize,
        height: height,
        opacity: this.randomRange(this.cloudMinOpacity, this.cloudMaxOpacity),
        duration: duration,
        delay: this.randomRange(0, (this.cloudMinDuration + this.cloudMaxDuration) / 2),
        zIndex: this.cloudBaseZIndex + Math.random(),
        puffs: puffs
      });
    }
    this.cloudLayers = clouds;
    console.log(`CloudsComponent: Generated ${this.cloudLayers.length} clouds.`);
  }

  // --- Helper Method (Moved from CanvasComponent) ---
  private randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  // --- TrackBy Function (Moved from CanvasComponent) ---
  trackByCloudId(index: number, cloud: Cloud): string {
    return cloud.id;
  }
}
