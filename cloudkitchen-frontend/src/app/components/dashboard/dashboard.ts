// src/app/components/dashboard/dashboard.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import {
  Subject,
  interval,
  startWith,
  switchMap,
  takeUntil,
  forkJoin,
  map,
  catchError,
  of,
  Observable
} from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

type Stats = {
  totalRecipes: number | null;
  totalInventory: number | null;
  totalUsers: number | null;
  cuisineTypes: number | null;
  totalValue: number | null;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private destroy$ = new Subject<void>();

  studentId = environment.studentId;
  studentName = 'CloudKitchen portfolio demo';
  logoPath = '/img/logo_2.png';
  user: any = null;

  totalRecipes: number | null = null;
  totalInventory: number | null = null;
  totalUsers: number | null = null;
  cuisineTypes: number | null = null;
  totalValue: number | null = null;

  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.user = this.auth.getCurrentUser();

    // Refresh immediately, then every 30s
    interval(30000)
      .pipe(
        startWith(0),
        switchMap(() => this.fetchStats$()),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (s) => {
          this.error = null;
          this.totalRecipes   = s.totalRecipes;
          this.totalInventory = s.totalInventory;
          this.totalUsers     = s.totalUsers;
          this.cuisineTypes   = s.cuisineTypes;
          this.totalValue     = s.totalValue;
        },
        error: (err) => {
          this.error =
            err?.status === 401 || err?.status === 403
              ? 'Please log in to view stats.'
              : 'Failed to load dashboard stats. Check API or network (see console).';
          console.error('Dashboard load error', err);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private fetchStats$(): Observable<Stats> {
    this.loading = true;

    const recipesUrl  = `/api/recipes-${this.studentId}`;
    const invUrl      = `/api/inventory-json-${this.studentId}`;
    const usersCntUrl = `/api/users-count-${this.studentId}`;

    return forkJoin({
      recipes:   this.http.get<any[]>(recipesUrl).pipe(catchError(() => of([]))),
      inventory: this.http.get<any[]>(invUrl).pipe(catchError(() => of([]))),
      usersCount: this.http
        .get<{ count: number }>(usersCntUrl)
        .pipe(catchError(() => of({ count: null as unknown as number })))
    }).pipe(
      map(({ recipes, inventory, usersCount }) => {
        const cuisinesSet = new Set(
          (recipes ?? []).map((r: any) => r?.cuisineType ?? 'Unknown')
        );

        // ✅ Sum ONLY the cost field (cost is the total for the record)
        const totalValue = (inventory ?? []).reduce((acc: number, it: any) => {
          const c = typeof it?.cost === 'number' ? it.cost : parseFloat(it?.cost) || 0;
          return acc + c;
        }, 0);

        this.loading = false;
        return {
          totalRecipes:   (recipes ?? []).length,
          totalInventory: (inventory ?? []).length,
          totalUsers:     usersCount?.count ?? null,
          cuisineTypes:   cuisinesSet.size,
          totalValue
        } as Stats;
      }),
      catchError((err) => {
        this.loading = false;
        throw err;
      })
    );
  }

  /** Manual one-shot refresh for the Refresh button */
  triggerRefresh(): void {
    this.fetchStats$().subscribe({
      next: (s) => {
        this.error = null;
        this.totalRecipes   = s.totalRecipes;
        this.totalInventory = s.totalInventory;
        this.totalUsers     = s.totalUsers;
        this.cuisineTypes   = s.cuisineTypes;
        this.totalValue     = s.totalValue;
      },
      error: (err) => {
        this.error =
          err?.status === 401 || err?.status === 403
            ? 'Please log in to view stats.'
            : 'Failed to load dashboard stats. Check API or network (see console).';
        console.error('Dashboard load error', err);
      }
    });
  }

  get displayName(): string | null {
    if (!this.user) return null;
    return this.user.fullname || this.user.email || this.user.userId || null;
  }
}
