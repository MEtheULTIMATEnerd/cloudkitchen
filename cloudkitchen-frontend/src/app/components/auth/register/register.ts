// src/app/components/auth/register/register.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  ValidatorFn,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../models/user';

const STRONG_PW = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html'
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  roles: UserRole[] = ['chef', 'manager', 'user'];

  // UI state
  pwVisible = false;
  private pwFocused = signal(false);
  phonePlaceholder = '+614XXXXXXXX or 04XXXXXXXX';

  // submit + banner state
  submitted = false;
  errorMsg: string | null = null;
  busy = false;

  private strongPassword(): ValidatorFn {
    return (c: AbstractControl): ValidationErrors | null => {
      const v = (c.value ?? '') as string;
      if (!v) return { required: true };
      return STRONG_PW.test(v) ? null : { weak: true };
    };
  }

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [this.strongPassword()]],
    fullname: ['', [Validators.required]],
    role: [null as UserRole | null, [Validators.required]],
    phone: ['', [Validators.required, Validators.pattern(/^(\+614\d{8}|04\d{8})$/)]]
  });

  ngOnInit(): void {
    // As the user types after a submit, keep the banner accurate (or hide it if valid)
    this.form.valueChanges.subscribe(() => {
      if (!this.submitted) return;

      if (this.form.valid) {
        this.errorMsg = null;
      } else {
        this.errorMsg = this.firstErrorMessage();
      }
    });
  }

  // ----- password hint helpers (no banner interaction)
  onPwFocus() { this.pwFocused.set(true); }
  onPwBlur()  { this.pwFocused.set(false); }
  shouldShowPwHint(): boolean {
    const ctrl = this.form.get('password');
    return this.pwFocused() && !!ctrl && ctrl.invalid;
  }
  togglePwVisibility() { this.pwVisible = !this.pwVisible; }

  onPhoneFocus() { this.phonePlaceholder = ''; }
  onPhoneBlur()  { if (!this.form.get('phone')?.value) this.phonePlaceholder = '+614XXXXXXXX or 04XXXXXXXX'; }

  onSubmit() {
    this.submitted = true;
    this.errorMsg = null;

    if (this.form.invalid) {
      this.errorMsg = this.firstErrorMessage();
      return;
    }

    const raw = this.form.value || {};
    const payload = {
      email: String(raw.email ?? '').trim(),
      password: String(raw.password ?? ''),
      fullname: String(raw.fullname ?? '').trim(),
      role: (raw.role ?? 'user') as UserRole,
      phone: raw.phone ? String(raw.phone).trim() : undefined
    };

    this.busy = true;
    this.auth.register(payload).subscribe({
      next: () => { this.busy = false; this.router.navigate(['/login']); },
      error: (err) => {
        this.busy = false;
        this.errorMsg = err?.error?.message || 'Registration failed. Please try again.';
      }
    });
  }

  // Build the first, most helpful message based on current errors
  private firstErrorMessage(): string {
    const email = this.form.get('email');
    const pw    = this.form.get('password');
    const name  = this.form.get('fullname');
    const role  = this.form.get('role');
    const phone = this.form.get('phone');

    if (email?.hasError('required')) return 'Email is required.';
    if (email?.hasError('email'))    return 'Please enter a valid email address.';
    if (pw?.hasError('required'))    return 'Password is required.';
    if (pw?.hasError('weak'))        return 'Password must be 8+ chars and include uppercase, lowercase, number, and special character.';
    if (name?.hasError('required'))  return 'Full name is required.';
    if (role?.hasError('required'))  return 'Please select a role.';
    if (phone?.hasError('required')) return 'Phone number is required.';
    if (phone?.hasError('pattern')) return 'Use an Australian mobile number such as 0400000000.';
    return 'Please fix highlighted errors before submitting.';
  }
}
