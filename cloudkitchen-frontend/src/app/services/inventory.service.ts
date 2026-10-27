import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { InventoryItem } from '../models/inventory'; // adjust path if different

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);
  private sid  = environment.studentId;
  private base = (environment.apiBaseUrl || '').replace(/\/+$/, '');
  private opts = { withCredentials: true };

  /** GET: list all inventory items */
  list(): Observable<InventoryItem[]> {
    return this.http
      .get<InventoryItem[] | any>(`${this.base}/api/inventory-${this.sid}`, this.opts)
      .pipe(
        map(res => Array.isArray(res) ? res : []),
        catchError((err: HttpErrorResponse) =>
          throwError(() => new Error(err?.error?.message || 'Failed to fetch inventory'))
        )
      );
  }

  /** GET: one item by id (supports `{ ok, item }` or plain doc) */
  getOne(itemId: string): Observable<InventoryItem> {
    return this.http
      .get(`${this.base}/api/inventory/${itemId}-${this.sid}`, this.opts)
      .pipe(
        map((res: any) => res?.item ?? res),   // ⬅️ unwrap
        catchError((err: HttpErrorResponse) =>
          throwError(() => new Error(err?.error?.message || 'Failed to fetch item'))
        )
      );
  }

  /** POST: create item */
  create(payload: Partial<InventoryItem>): Observable<any> {
    return this.http
      .post(`${this.base}/api/inventory/add-${this.sid}`, payload, this.opts)
      .pipe(
        catchError((err: HttpErrorResponse) =>
          throwError(() => new Error(err?.error?.message || 'Failed to create item'))
        )
      );
  }

  /** POST: update item (expects `inventoryId` in payload) */
  update(payload: Partial<InventoryItem> & { inventoryId: string }): Observable<any> {
    return this.http
      .post(`${this.base}/api/inventory/update-${this.sid}`, payload, this.opts)
      .pipe(
        catchError((err: HttpErrorResponse) =>
          throwError(() => new Error(err?.error?.message || 'Failed to update item'))
        )
      );
  }

  /** POST: delete one or many items (backend expects `inventoryIds`) */
  deleteMany(ids: string[] | string) {
    const inventoryIds = Array.isArray(ids) ? ids : [ids];
    return this.http.post(`${this.base}/api/inventory/delete-multiple-${this.sid}`, { inventoryIds }, this.opts);
  }
}