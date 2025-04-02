// src/app/stars/stars.component.ts
import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';

// Keep the interface definition here or move to a shared interfaces file
export interface Star {
  id: number;
  x: number; // Percentage (0-100)
  y: number; // Absolute pixel position within the *entire* scrollable canvas
  size: number; // Pixel size (e.g., 1, 2, 3)
  opacity: number; // Base opacity (0.5 - 1.0)
  animationDuration: number; // Duration for twinkling (e.g., 2s - 5s)
  animationDelay: number; // Stagger animation start (e.g., 0s - 5s)
  driftDuration?: number;
  driftDelay?: number;
}

@Component({
  selector: 'app-stars',
  templateUrl: './stars.component.html',
  styleUrls: ['./stars.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StarsComponent implements OnInit {

  // --- Inputs from Parent ---
  @Input() starCount: number = 250;       // Default if not provided
  @Input() skyZoneLimit: number = 6000;   // Default limit
  @Input() visualHeight: number = 12000;  // Default height (less critical now)
  @Input() taperHeight: number = 800;     // Default taper height
  @Input() taperExponent: number = 1;     // Default taper exponent (linear)
  @Input() minOpacity: number = 0.01;

  // --- Internal State ---
  stars: Star[] = [];
  private starIdCounter = 0;

  constructor() { }

  ngOnInit(): void {
    // Ensure exponent is at least 1 for sensible results
    if (this.taperExponent < 1) {
      console.warn(`Star taper exponent (${this.taperExponent}) is less than 1. Using 1 (linear).`);
      this.taperExponent = 1;
    }
    this.generateStars();
  }

  // --- Star Generation Logic (with aggressive taper) ---
  generateStars(): void {
    this.stars = [];
    this.starIdCounter = 0;
    const effectiveSkyLimit = Math.min(this.skyZoneLimit, this.visualHeight); // Use skyZoneLimit from input
    const taperStartY = Math.max(0, effectiveSkyLimit - this.taperHeight);

    let attempts = 0;
    // Adjust maxAttempts if needed, higher exponent might reject more stars
    const maxAttempts = this.starCount * (this.taperExponent * 3 + 2); // Heuristic adjustment

    console.log(`Generating stars up to ${effectiveSkyLimit}px, tapering starts at ${taperStartY}px with exponent ${this.taperExponent}.`);

    while (this.stars.length < this.starCount && attempts < maxAttempts) {
      attempts++;
      const potentialY = Math.random() * effectiveSkyLimit;
      let createStar = true;
      let calculatedOpacity = Math.random() * 0.5 + 0.5; // Base random opacity

      // Check if inside the taper zone
      if (potentialY > taperStartY && this.taperHeight > 0) {
        // Calculate linear taper factor (0.0 at limit, 1.0 at start)
        const linearTaperFactor = 1.0 - (potentialY - taperStartY) / this.taperHeight;

        // --- Apply Exponent for Aggressiveness ---
        // Use Math.pow() to shape the taper curve
        const aggressiveTaperFactor = Math.pow(linearTaperFactor, this.taperExponent);

        // --- Density Tapering ---
        // Probability decreases much faster with the aggressive factor
        if (Math.random() > aggressiveTaperFactor) {
          createStar = false; // Skip star
        } else {
          // --- Opacity Tapering ---
          // Reduce opacity using the aggressive factor
          calculatedOpacity *= aggressiveTaperFactor;
        }
      }

      // If the star wasn't rejected by density check
      if (createStar) {
        this.stars.push({
          id: this.starIdCounter++,
          x: Math.random() * 100,
          y: potentialY,
          size: Math.floor(Math.random() * 3) + 1,
          // Ensure opacity has a minimum value
          opacity: Math.max(this.minOpacity, calculatedOpacity),
          animationDuration: Math.random() * 3 + 2,
          animationDelay: Math.random() * 5,
          driftDuration: Math.random() * 20 + 15,
          driftDelay: Math.random() * 10,
        });
      }
    } // End while loop

    if (attempts >= maxAttempts && this.stars.length < this.starCount) {
      console.warn(`Star generation hit max attempts (${maxAttempts}) before reaching target count (${this.starCount}). Generated ${this.stars.length} stars. Consider increasing starCount input or reducing taperExponent.`);
    } else {
      console.log(`StarsComponent generated ${this.stars.length} star elements with exponent ${this.taperExponent} tapering.`);
    }

  }

  trackStarById(index: number, star: Star): number {
    return star.id;
  }
}
