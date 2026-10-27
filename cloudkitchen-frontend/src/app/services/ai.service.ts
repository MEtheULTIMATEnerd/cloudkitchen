// src/app/services/ai.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface AiAnalysis {
  healthScore: number;
  calorieEstimate: number;
  risks: string[];
  suggestions: string[];
  summary: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;
  private id   = environment.studentId;

  analyze(payload: { title?: string; ingredients: string[] | string }) {
    const url = `${this.base}/api/ai/analyze-${this.id}`;
    return this.http.post<{ ok: boolean; result?: AiAnalysis; message?: string }>(url, payload, {
      withCredentials: true
    });
  }
}