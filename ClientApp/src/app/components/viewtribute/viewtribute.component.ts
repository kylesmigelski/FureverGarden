import {Component, Input, Output, EventEmitter, ChangeDetectionStrategy, SimpleChanges} from '@angular/core';
import { TributePoint } from '../../services/tribute.service'; // Adjust path

@Component({
  selector: 'app-viewtribute',
  templateUrl: './viewtribute.component.html',
  styleUrls: ['./viewtribute.component.scss']
})
export class ViewtributeComponent {
  @Input() isVisible: boolean = false;
  @Input() selectedTribute: TributePoint | null = null;
  @Input() modalX: number = 0;
  @Input() modalY: number = 0;

  @Output() close = new EventEmitter<void>();

  private readonly s3BucketName = 'tribute-photos';
  private readonly s3Region = 'us-east-2';

  // --- Getter for the photo URL ---
  get photoUrl(): string | null {
    if (this.selectedTribute?.photoS3Key && this.s3BucketName && this.s3Region) {
      // Construct the standard S3 URL
      // Note: This assumes the object is publicly accessible! See security note below.
      return `https://${this.s3BucketName}.s3.${this.s3Region}.amazonaws.com/${this.selectedTribute.photoS3Key}`;
    }
    return null; // Return null if no key or config is available
  }

  // --- Log inputs on change ---
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible']) {
      console.log('ViewTribute: isVisible changed:', this.isVisible);
    }
    if (changes['selectedTribute']) {
      console.log('ViewTribute: selectedTribute changed:', this.selectedTribute);
      console.log('ViewTribute: photoUrl getter returns:', this.photoUrl); // Log the calculated URL
    }
  }

  onCloseClick(): void {
    this.close.emit();
  }

  stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }

  onImageError($event: ErrorEvent) {
    console.error('Image failed to load:', $event);
  }
}
