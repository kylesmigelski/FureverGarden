// src/app/services/tribute.service.ts
import { Injectable, inject } from '@angular/core'; // Import inject
import { HttpClient, HttpParams } from '@angular/common/http'; // Import HttpClient, HttpParams
import { Observable, throwError } from 'rxjs'; // Import Observable, throwError
import { catchError, map, tap } from 'rxjs/operators'; // Import operators

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

  // Replace with YOUR actual API Gateway Invoke URL
  private apiUrl = 'https://a0h9i0k1y7.execute-api.us-east-2.amazonaws.com';

  // --- Zone Config (needed for icon/zone derivation if NOT done in backend) ---
  // It's better if the backend calculates zone/icon based on Y,
  // but keep logic here if backend doesn't do it. We'll assume backend DOES it now.
  // private readonly spaceLimit = 4000;
  // private readonly skyLimit = 6000;
  // ... etc ...

  constructor() {
    // No longer need to generate initial tributes here
  }

  // --- Service Methods ---

  // GET /tributes
  getTributes(): Observable<TributePoint[]> {
    console.log('TributeService: Fetching tributes from API');
    return this.http.get<TributePoint[]>(`${this.apiUrl}/tributes`).pipe(
      tap(tributes => console.log(`TributeService: Received ${tributes.length} tributes`)),
      catchError(this.handleError) // Basic error handling
    );
  }

  // POST /tributes
  addTribute(payload: NewTributePayload): Observable<TributePoint> {
    console.log('TributeService: Adding tribute via API:', payload);
    // Backend now expects x, y, name, description?, photoS3Key?
    // Backend will calculate id, zone, icon, createdAt
    return this.http.post<TributePoint>(`${this.apiUrl}/tributes`, payload).pipe(
      tap(newTribute => console.log('TributeService: Successfully added tribute:', newTribute)),
      catchError(this.handleError)
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
