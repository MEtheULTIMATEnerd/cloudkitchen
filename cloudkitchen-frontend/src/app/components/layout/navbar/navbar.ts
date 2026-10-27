// src/app/components/layout/navbar/navbar.ts
import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import type { User } from '../../../models/user';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html'
})
export class NavbarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  // Angular-driven dropdown state (no Bootstrap JS needed)
  menuOpen = signal(false);

  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  get user(): User | null {
    return this.auth.getCurrentUser();
  }

  displayName(u: User | null): string {
    return (u?.fullname || u?.email || 'Account').trim();
  }

  firstInitial(u: User | null): string {
    const s = this.displayName(u);
    return s ? s[0].toUpperCase() : 'U';
  }

  toggleMenu(ev?: Event) {
    ev?.preventDefault();
    ev?.stopPropagation();
    this.menuOpen.update(v => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  // Close dropdown when clicking anywhere outside
  @HostListener('document:click')
  onDocumentClick() {
    this.closeMenu();
  }

  // Keep menu open when interacting inside it
  stop(e: Event) {
    e.stopPropagation();
  }

  logout(ev?: Event) {
    ev?.preventDefault();
    this.auth.logout().subscribe({
      next: () => {
        this.menuOpen.set(false);
        this.router.navigate(['/login']);
      },
      error: () => {
        this.menuOpen.set(false);
        this.router.navigate(['/login']);
      }
    });
  }
}