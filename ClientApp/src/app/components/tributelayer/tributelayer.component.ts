import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { TributePoint } from '../../services/tribute.service'; // Adjust path as needed

@Component({
  selector: 'app-tributelayer',
  templateUrl: './tributelayer.component.html',
  styleUrls: ['./tributelayer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TributeLayerComponent {
  @Input() tributePoints: TributePoint[] | null = []; // Accept null from async pipe

  // Emit the point and the original mouse event for positioning the details modal
  @Output() tributeClicked = new EventEmitter<{ tribute: TributePoint, event: MouseEvent }>();

  onPointClick(tribute: TributePoint, event: MouseEvent): void {
    event.stopPropagation(); // Prevent canvas click handler
    this.tributeClicked.emit({ tribute, event });
    console.log( 'Tribute point clicked:', tribute);
  }

  trackTributeById(index: number, point: TributePoint): string {
    return point.id;
  }
}
