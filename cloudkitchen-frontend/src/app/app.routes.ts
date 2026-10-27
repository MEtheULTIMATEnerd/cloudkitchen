import { Routes } from '@angular/router';
import type { Type } from '@angular/core';
import { AuthGuard } from './services/auth-guard';
import { UnauthGuard } from './services/unauth-guard';

/** Kept from your file (used by some lazy modules). */
function pickExport(module: any, candidates: string[]): Type<any> {
  for (const c of candidates) if (module && module[c]) return module[c];
  if (module && module.default) return module.default;
  throw new Error(`No matching export found on module. Tried: ${candidates.join(', ')}`);
}

export const routes: Routes = [
  // Start at login
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // ===== AUTH (blocked if already logged in) =====
  {
    path: 'login',
    canActivate: [UnauthGuard],
    loadComponent: () =>
      import('./components/auth/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    canActivate: [UnauthGuard],
    loadComponent: () =>
      import('./components/auth/register/register').then(m => m.RegisterComponent)
  },

  // ===== DASHBOARD (protected) =====
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/dashboard/dashboard').then(m => m.DashboardComponent)
  },

  // ===== RECIPES (protected) =====
  {
    path: 'recipes',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/recipes/recipes').then(m => m.RecipesComponent)
  },
  {
    path: 'recipes/add',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/recipes/add-recipe/add-recipe').then(m => m.AddRecipeComponent)
  },
  {
    path: 'recipes/edit/:id',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/recipes/edit-recipe/edit-recipe').then(m => m.EditRecipeComponent)
  },
  {
    path: 'recipes/view/:id',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/recipes/view-recipe/view-recipe').then(m => m.ViewRecipeComponent)
  },
  {
    path: 'recipes/delete/:id',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/recipes/delete-recipe/delete-recipe').then(m => m.DeleteRecipeComponent)
  },

  // ===== INVENTORY (protected) =====
  {
    path: 'inventory',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/inventory/inventory').then(m => m.InventoryComponent)
  },
  {
    path: 'inventory/add',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/inventory/add-inventory/add-inventory').then(m => m.AddInventoryComponent)
  },
  {
    path: 'inventory/edit/:id',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/inventory/edit-inventory/edit-inventory').then(m => m.EditInventoryComponent)
  },
  {
    path: 'inventory/view/:id',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/inventory/view-inventory/view-inventory').then(m => m.ViewInventoryComponent)
  },
  {
    path: 'inventory/delete/:id',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/inventory/delete-inventory/delete-inventory').then(m => m.DeleteInventoryComponent)
  },

  // ===== NOT FOUND =====
  {
    path: '404',
    loadComponent: () =>
      import('./components/not-found/not-found').then(m => m.NotFoundComponent)
  },

  // ===== FALLBACK =====
  { path: '**', redirectTo: 'login' }
];