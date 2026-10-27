// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User } from '../models/user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = environment.apiBaseUrl;
  private studentId  = environment.studentId;

  constructor(private http: HttpClient) {}

  register(payload: { email: string; password: string; fullname: string; role: string; phone?: string }) {
    const url = `${this.base}/api/register-${this.studentId}`;
    return this.http.post<{ ok: boolean; message?: string }>(url, payload, {
      withCredentials: true
    });
  }

  login(email: string, password: string) {
    const url = `${this.base}/api/login-${this.studentId}`;
    return this.http.post<{ ok: boolean; user?: User; message?: string }>(url, { email, password }, {
      withCredentials: true
    }).pipe(
      tap(resp => {
        if (resp?.user) {
          localStorage.setItem('ckp_user', JSON.stringify(resp.user));
        }
      })
    );
  }

  logout() {
    // if you add /api/logout-<id> that clears session:
    const url = `${this.base}/api/logout-${this.studentId}`;
    localStorage.removeItem('ckp_user');
    return this.http.get(url, { withCredentials: true });
  }

  getCurrentUser(): User | null {
    const raw = localStorage.getItem('ckp_user');
    try { return raw ? JSON.parse(raw) as User : null; } catch { return null; }
  }

  isLoggedIn() { return !!this.getCurrentUser(); }
}