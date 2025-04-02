import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';

interface HillLayer {
  id: string;
  offsetTop: number;
  zIndex: number;
  pathData: string;
  color: string;
  height: number;
}

@Component({
  selector: 'app-hills',
  templateUrl: './hills.component.html',
  styleUrls: ['./hills.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HillsComponent implements OnInit {
  // --- Hill Layer Configuration ---
  hillLayers: HillLayer[] = [];
  readonly skyLimit = 6000;
  readonly VISUAL_HEIGHT = 12000;

  readonly hillSvgBaseHeight = 500;   // Increased base height for each SVG layer's container/viewBox
  readonly hillOverlapFactor = 0.75;  // Keep high overlap (adjust 0.0 to 1.0)

  readonly hillStartColor = '#90EE90'; // Light Green
  readonly hillMidColor = '#A0522D';   // Saddle Brown / Light Brown
  readonly hillEndColor = '#151010';   // Very Dark (almost black) - adjusted slightly from #101010 for smoother transition

  // --- Path Generation Config ---
  readonly pathBaseY = 80;             // Initial Y-offset within the SVG viewBox (adjust)
  readonly pathMinRandomness = 20;     // Starting vertical randomness (amplitude)
  readonly pathMaxRandomness = 120;    // Max vertical randomness (amplitude) for deepest layers

  // Base offset calculation: Start the first wave visually near the surface line.
  readonly baseHillOffsetY = this.hillSvgBaseHeight * 0.2; // e.g., 20% of the height
  readonly skyLimitForHills = this.skyLimit - this.baseHillOffsetY;

  ngOnInit(): void {
    this.createHillLayers();
  }

  createHillLayers(): void {
    const layers: HillLayer[] = [];
    const surfaceStartY = this.skyLimit;
    const undergroundHeight = this.VISUAL_HEIGHT - surfaceStartY;
    const verticalSpacing = this.hillSvgBaseHeight * (1 - this.hillOverlapFactor);

    // Ensure spacing is positive to avoid infinite loops
    if (verticalSpacing <= 0) {
      console.error("Hill overlap factor must be less than 1!");
      return;
    }

    // Calculate the number of layers needed to cover the underground area
    // Add a couple extra to ensure full coverage, especially with varying heights later maybe
    const requiredLayers = Math.ceil(undergroundHeight / verticalSpacing) + 2;
    console.log(`Generating ${requiredLayers} hill layers.`);


    for (let i = 0; i < requiredLayers; i++) {
      const layerId = `hill-layer-${i}`;
      // Progression factor: 0 for the first layer, 1 for the last
      const progression = requiredLayers > 1 ? i / (requiredLayers - 1) : 0;

      // --- Calculate Increasing Amplitude ---
      const currentRandomness = this.pathMinRandomness + (this.pathMaxRandomness - this.pathMinRandomness) * progression;

      // --- Optional: Slightly adjust base Y lower for deeper waves ---
      const currentBaseY = this.pathBaseY + (30 * progression); // Push wave start down slightly

      // --- Generate Path ---
      // Pass current parameters to the generator
      const pathData = this.generateRandomHillPath(currentBaseY, currentRandomness, this.hillSvgBaseHeight);

      // --- Calculate 3-Stage Color ---
      let color: string;
      const midPoint = 0.5; // Transition Green->Brown happens over first 50%
      if (progression < midPoint) {
        // Interpolate Green to Brown
        const factor = progression / midPoint; // Scale factor from 0 to 1 for this stage
        color = this.interpolateColor(this.hillStartColor, this.hillMidColor, factor);
      } else {
        // Interpolate Brown to Dark
        const factor = (progression - midPoint) / (1 - midPoint); // Scale factor from 0 to 1 for this stage
        color = this.interpolateColor(this.hillMidColor, this.hillEndColor, factor);
      }

      layers.push({
        id: layerId,
        // Offset based on index and spacing
        offsetTop: surfaceStartY - this.baseHillOffsetY + (i * verticalSpacing),
        // Deeper layers get higher zIndex for correct visual stacking
        zIndex: i + 1,
        pathData: pathData,
        color: color,
        height: this.hillSvgBaseHeight // Store height for viewBox
      });
    }
    this.hillLayers = layers;
  }

  private generateRandomHillPath(baseY: number, randomness: number, viewBoxHeight: number): string {
    const rand = (max: number) => (Math.random() - 0.5) * 2 * max; // Helper for +/- randomness
    const clampY = (y: number) => Math.max(5, Math.min(viewBoxHeight - 5, y)); // Clamp within viewbox

    // Define horizontal anchor points for our curve segments
    const xCoords = [0, 150, 300, 450, 600, 750, 850, 1000]; // More points for smoother sections

    // --- Generate Endpoint Y-coordinates ---
    const yCoords = xCoords.map(_ => clampY(baseY + rand(randomness * 0.8))); // Random endpoint heights (slightly less random than controls)

    // --- Generate Control Point Y-coordinates ---
    // We need 2 control points for the first 'C' segment, and 1 explicit control point
    // for each subsequent 'S' segment. The 'S' command implicitly determines its first control point.

    // Control points for the FIRST segment (0 to xCoords[1])
    // Control Point 1 (near start) - influence start tangent
    const cp1_1y = clampY(baseY + rand(randomness));
    // Control Point 2 (near end) - influence end tangent
    const cp1_2y = clampY(baseY + rand(randomness));

    // Control points for SUBSEQUENT 'S' segments (We only need the *second* control point for 'S')
    // These points influence the tangent approaching the *next* endpoint.
    const cpS_y: number[] = [];
    for (let i = 1; i < xCoords.length - 1; i++) {
      cpS_y.push(clampY(baseY + rand(randomness)));
    }

    // --- Build the Path String ---
    let d = `M ${xCoords[0]} ${yCoords[0]}`; // Start point

    // First segment: Use 'C' command (needs 2 control points)
    // Place control points horizontally between the endpoints
    const cp1_1x = xCoords[0] + (xCoords[1] - xCoords[0]) * 0.33; // e.g., 1/3 along
    const cp1_2x = xCoords[0] + (xCoords[1] - xCoords[0]) * 0.66; // e.g., 2/3 along
    d += ` C ${cp1_1x} ${cp1_1y}, ${cp1_2x} ${cp1_2y}, ${xCoords[1]} ${yCoords[1]}`;

    // Subsequent segments: Use 'S' command (needs 1 explicit control point)
    for (let i = 1; i < xCoords.length - 1; i++) {
      // Place the explicit control point horizontally between the *previous* endpoint and the *current* endpoint
      // This control point influences the curve *approaching* xCoords[i+1]
      const cpSx = xCoords[i] + (xCoords[i+1] - xCoords[i]) * 0.66; // e.g., 2/3 along the segment
      d += ` S ${cpSx} ${cpS_y[i-1]}, ${xCoords[i+1]} ${yCoords[i+1]}`;
    }

    // Close the path along the bottom
    d += ` L 1000 ${viewBoxHeight} L 0 ${viewBoxHeight} Z`;

    return d;
  }

  /**
   * Interpolates between two hex colors. (No changes needed)
   */
  private interpolateColor(color1: string, color2: string, factor: number): string {
    // Ensure factor is clamped between 0 and 1
    factor = Math.max(0, Math.min(1, factor));

    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);

    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);

    const toHex = (c: number) => c.toString(16).padStart(2, '0');

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  trackByLayerId(index: number, layer: HillLayer): string {
    return layer.id;
  }

}
