// src/app/services/tribute.service.ts
import { Injectable, inject } from '@angular/core'; // Import inject
import { HttpClient, HttpParams } from '@angular/common/http'; // Import HttpClient, HttpParams
import {BehaviorSubject, Observable, throwError} from 'rxjs'; // Import Observable, throwError
import { catchError, map, tap } from 'rxjs/operators';
import {environment} from "../../environments/environment.prod"; // Import operators

// Keep interfaces here or move to a shared models file
export type TributeZone = 'space' | 'sky' | 'surface' | 'roots' | 'deep';

export interface TributePoint {
  id: string; // DynamoDB ID will be string (UUID)
  x: number;
  y: number;
  icon: string;
  name: string;
  description?: string | null; // Allow null from DB
  zone: TributeZone;
  photoS3Key?: string | null; // Allow null from DB
  createdAt: string; // Store as ISO string
}

// Data structure for POST request to /tributes
export interface NewTributePayload {
  x: number;
  y: number;
  name: string;
  description?: string | null;
  photoS3Key?: string | null;
}

// Response from GET /generate-upload-url
export interface PresignedUrlResponse {
  uploadUrl: string;
  s3Key: string;
}

@Injectable({
  providedIn: 'root'
})
export class TributeService {
  private http = inject(HttpClient); // Inject HttpClient
  private apiUrl = environment.apiUrl;

  private tributeSubject = new BehaviorSubject(<TributePoint[]>[]);
  public tributes$: Observable<TributePoint[]> = this.tributeSubject.asObservable();

  constructor() {
    this.fetchAndNotifyTributes().subscribe();
  }

  // --- Service Methods ---

  // GET /tributes
  fetchAndNotifyTributes(): Observable<void> {
    console.log('TributeService: Fetching tributes from API...');
    return this.http.get<TributePoint[]>(`${this.apiUrl}/tributes`).pipe(
      tap(tributes => {
        console.log(`TributeService: Received ${tributes.length} tributes, updating subject.`);
        this.tributeSubject.next(tributes); // Update the BehaviorSubject
      }),
      map(() => void 0), // Transform the tribute array result into void for the return type
      catchError(err => {
        console.error('TributeService: Failed to fetch tributes:', err);
        return throwError(() => new Error('Failed to fetch tributes')); // Propagate error
      })
    );
  }

  // POST /tributes
  addTribute(payload: NewTributePayload): Observable<TributePoint> {
    console.log('TributeService: Adding tribute via API:', payload);
    return this.http.post<TributePoint>(`${this.apiUrl}/tributes`, payload).pipe(
      tap((addedTribute) => {
        console.log('TributeService: Add successful, triggering refresh...', addedTribute);
        this.fetchAndNotifyTributes().subscribe({
          error: err => console.error("Error during refresh after add:", err) // Log refresh errors separately
        });
        // ---------------------------------------------
      }),
      catchError(this.handleError) // Handle errors from the POST itself
    );
  }

  // GET /generate-upload-url
  getPhotoUploadUrl(filename: string, contentType: string): Observable<PresignedUrlResponse> {
    console.log(`TributeService: Getting upload URL for ${filename} (${contentType})`);
    const params = new HttpParams()
      .set('filename', filename)
      .set('contentType', contentType);
    return this.http.get<PresignedUrlResponse>(`${this.apiUrl}/generate-upload-url`, { params }).pipe(
      tap(res => console.log('TributeService: Received upload URL and key')),
      catchError(this.handleError)
    );
  }

  // PUT to S3 Pre-Signed URL
  uploadPhotoToS3(uploadUrl: string, file: File): Observable<any> {
    console.log(`TributeService: Uploading ${file.name} directly to S3`);
    return this.http.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type },
      responseType: 'text' // Or 'blob' if needed, 'text' often safer for S3 PUT
    }).pipe(
      tap(() => console.log('TributeService: S3 Upload successful')),
      catchError(this.handleError)
    );
  }

  getZoneByY(y: number): TributeZone {
    // Logic to determine zone based on Y coordinate
    if (y < 4000) return 'space';
    else if (y < 6000) return 'sky';
    else if (y < 8000) return 'surface';
    else if (y < 10000) return 'roots';
    else return 'deep';
  }
  getDefaultIconByZone(zone: TributeZone): string {
    // Logic to determine default icon based on zone
    switch (zone) {
      case 'space': return 'rocket';
      case 'sky': return 'cloud';
      case 'surface': return 'tree';
      case 'roots': return 'root';
      case 'deep': return 'cave';
      default: return 'default-icon'; // Fallback icon
    }
  }

  // --- Basic Error Handler ---
  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    // Return an observable with a user-facing error message
    return throwError(() => new Error('Something bad happened; please try again later. Details in console.'));
  }
}
