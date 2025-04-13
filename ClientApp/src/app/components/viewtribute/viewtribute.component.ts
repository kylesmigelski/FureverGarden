import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  SimpleChanges,
  HostListener
} from '@angular/core';
import { TributePoint } from '../../services/tribute.service';
import {Lightbox} from "ngx-lightbox"; // Adjust path

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

  imageLoadError = false; // Flag for image loading error

  private readonly s3BucketName = 'tribute-photos';
  private readonly s3Region = 'us-east-2'

  constructor(private lightbox: Lightbox) {}

  openPhotoViewer(url: string, caption: string): void {
    const album = [{ src: url, caption: caption, thumb: url }];
    this.lightbox.open(album, 0);
  }

  // --- Getter for the photo URL ---
  get photoUrl(): string | null {
    if (this.selectedTribute?.photoS3Key && this.s3BucketName && this.s3Region) {
      // Construct the standard S3 URL
      return `https://${this.s3BucketName}.s3.${this.s3Region}.amazonaws.com/${this.selectedTribute.photoS3Key}`;
    }
    return null; // Return null if no key or config is available
  }

  // --- Log inputs on change ---
  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['isVisible'] && this.isVisible) || changes['selectedTribute']) {
      this.imageLoadError = false;
    }
    if (changes['selectedTribute']) {
      console.log('ViewTribute: selectedTribute changed:', this.selectedTribute);
      console.log('ViewTribute: photoUrl getter returns:', this.photoUrl); // Log the calculated URL
    }
  }

  onImageError(event: Event): void {
    console.warn('Image failed to load:', (event.target as HTMLImageElement)?.src);
    this.imageLoadError = true;
  }

  onCloseClick(event?: MouseEvent): void {
    event?.stopPropagation();
    this.close.emit();
  }

  stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }

  isDesktop = window.innerWidth >= 640;

  @HostListener('window:resize')
  onResize() {
    this.isDesktop = window.innerWidth >= 640;
  }

}
