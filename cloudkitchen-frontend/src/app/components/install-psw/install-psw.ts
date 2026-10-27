// src/app/components/install-pwa/install-pwa.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-install-pwa',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button *ngIf="canInstall()" class="btn btn-outline-primary btn-sm" (click)="install()">
      Install App
    </button>
  `
})
export class InstallPwaComponent {
  private deferredPrompt: any = null;
  canInstall = signal(false);

  constructor() {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.canInstall.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
    });
  }

  async install() {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    this.canInstall.set(false);
  }
}