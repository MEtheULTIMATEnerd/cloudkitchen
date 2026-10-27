// src/app/components/auth/login/login.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // form
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  // ui state
  pwVisible = false;
  togglePwVisibility() { this.pwVisible = !this.pwVisible; }

  showPwHint = signal(false);
  togglePwHint(show: boolean) { this.showPwHint.set(show); }

  errorMsg: string | null = null;
  busy = false;

  onSubmit() {
    this.errorMsg = null;

    if (this.form.invalid) {
      if (this.form.get('email')?.hasError('required')) this.errorMsg = 'Email is required.';
      else if (this.form.get('email')?.hasError('email')) this.errorMsg = 'Please enter a valid email address.';
      else if (this.form.get('password')?.hasError('required')) this.errorMsg = 'Password is required.';
      else this.errorMsg = 'Please fix the highlighted fields.';
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.value as { email: string; password: string };

    this.busy = true;
    this.auth.login(String(email || ''), String(password || '')).subscribe({
      next: () => {
        this.busy = false;
        // Redirect to intended URL if the guard supplied one, else dashboard
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.busy = false;
        this.errorMsg = err?.error?.message || 'Invalid email or password.';
      }
    });
  }
}