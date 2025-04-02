import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
  inject // Keep inject
} from '@angular/core';
import { TributeService, TributeZone, PresignedUrlResponse, TributePoint } from '../../services/tribute.service'; // Adjust path
import { switchMap, catchError } from 'rxjs/operators'; // Import operators
import { of } from 'rxjs'; // Import 'of'

export interface PendingTribute {
  x: number;
  y: number;
  modalX: number;
  modalY: number;
  icon: string;
  zone: TributeZone;
}

@Component({
  selector: 'app-newtribute',
  templateUrl: './newtribute.component.html',
  styleUrls: ['./newtribute.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewTributeComponent implements OnChanges { // Make sure class name matches file/selector if needed
  @Input() isVisible: boolean = false;
  @Input() pendingTribute: PendingTribute | null = null;

  @Output() confirm = new EventEmitter<{ name: string, description: string, photoS3Key: string | null }>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('tributeNameInputRef') tributeNameInputRef!: ElementRef<HTMLInputElement>;

  // Local state for form inputs
  tributeNameInput: string = '';
  tributeDescInput: string = '';

  selectedFile: File | null = null;
  selectedFileName: string | null = null;
  uploadError: string | null = null;
  isUploading: boolean = false;

  private tributeService = inject(TributeService); // Inject TributeService

  ngOnChanges(changes: SimpleChanges): void {
    // When modal becomes visible, focus the input and reset fields
    if (changes['isVisible'] && this.isVisible && this.pendingTribute) {
      this.tributeNameInput = '';
      this.tributeDescInput = '';
      this.selectedFile = null;
      this.selectedFileName = null;
      this.uploadError = null;
      this.isUploading = false;
      setTimeout(() => this.tributeNameInputRef?.nativeElement.focus(), 0);
    }
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      this.selectedFile = fileList[0];
      this.selectedFileName = this.selectedFile.name;
      this.uploadError = null; // Clear previous errors
      console.log('File selected:', this.selectedFile);
    } else {
      this.selectedFile = null;
      this.selectedFileName = null;
    }
  }

  onConfirmClick(): void { // No longer needs async/await if using RxJS subscribe fully
    if (!this.pendingTribute || this.isUploading) return;

    this.isUploading = true;
    this.uploadError = null;
    let s3Key: string | null = null;

    const processTributeAddition = () => {
      console.log('Emitting confirm event. S3 Key:', s3Key);
      // Ensure emitted object matches the updated EventEmitter type
      this.confirm.emit({
        name: this.tributeNameInput,
        description: this.tributeDescInput,
        photoS3Key: s3Key
      });
    };

    if (this.selectedFile) {
      const file = this.selectedFile;
      this.tributeService.getPhotoUploadUrl(file.name, file.type)
        .pipe(
          switchMap((response: PresignedUrlResponse) => {
            console.log('Got pre-signed URL:', response.uploadUrl, 'Key:', response.s3Key);
            s3Key = response.s3Key;
            return this.tributeService.uploadPhotoToS3(response.uploadUrl, file);
          }),
          catchError(err => {
            console.error("Photo upload failed:", err);
            this.uploadError = "Photo upload failed. Please try again.";
            this.isUploading = false; // Reset upload flag on error
            return of(null); // Prevent confirm emission on error
          })
        )
        .subscribe(result => {
          if (result !== null) { // Successfully uploaded (didn't hit catchError)
            console.log('Successfully uploaded to S3. Key:', s3Key);
            processTributeAddition(); // Emit confirm *after* successful upload
          }
        });
    } else {
      // No file selected, proceed directly to emitting confirm
      processTributeAddition();
    }
  }

  onCancelClick(): void {
    this.cancel.emit();
  }

  stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }
}
