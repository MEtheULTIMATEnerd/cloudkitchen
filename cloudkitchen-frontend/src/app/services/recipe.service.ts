import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { Recipe } from '../models/recipe';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private http = inject(HttpClient);
  private sid = environment.studentId;
  private base = (environment.apiBaseUrl || '').replace(/\/+$/, '');
  private opts = { withCredentials: true };

  /** Logged-in list (old route: owner-only unless admin). */
  list(): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(`${this.base}/api/recipes-${this.sid}`, this.opts).pipe(
      map(a => Array.isArray(a) ? a : []),
      catchError(err => throwError(() => err))
    );
  }

  /** Public list (if you DO keep a public endpoint; if not, you can call list()). */
  listAll(): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(`${this.base}/api/recipes-${this.sid}`, this.opts).pipe(
      map(a => Array.isArray(a) ? a : []),
      catchError(err => throwError(() => err))
    );
  }

  getOne(recipeId: string): Observable<Recipe> {
    return this.http.get<{ok:boolean; recipe:Recipe}>(`${this.base}/api/recipes/${recipeId}-${this.sid}`, this.opts).pipe(
      map(r => r.recipe),
      catchError(err => throwError(() => err))
    );
  }

  create(payload: Partial<Recipe>): Observable<any> {
    return this.http.post(`${this.base}/api/recipes/add-${this.sid}`, payload, this.opts).pipe(
      catchError(err => throwError(() => err))
    );
  }

  update(payload: Partial<Recipe>): Observable<any> {
    return this.http.post(`${this.base}/api/recipes/update-${this.sid}`, payload, this.opts).pipe(
      catchError(err => throwError(() => err))
    );
  }

  deleteMany(recipeIds: string[] | string): Observable<any> {
    const ids = Array.isArray(recipeIds) ? recipeIds : [recipeIds];
    // old route name (single) is fine for one; works for many too with our backend handler
    return this.http.post(`${this.base}/api/recipes/delete-${this.sid}`, { recipeIds: ids }, this.opts).pipe(
      catchError(err => throwError(() => err))
    );
  }
}